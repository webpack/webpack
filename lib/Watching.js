/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Stats = require("./Stats");

/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compiler")} Compiler */

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} result
 */

class Watching {
	/**
	 * @param {Compiler} compiler the compiler
	 * @param {WatchOptions} watchOptions options
	 * @param {Callback<Stats>} handler completion handler
	 */
	constructor(compiler, watchOptions, handler) {
		this.startTime = null;
		this.invalid = false;
		this.handler = handler;
		/** @type {Callback<void>[]} */
		this.callbacks = [];
		/** @type {Callback<void>[] | undefined} */
		this._closeCallbacks = undefined;
		this.closed = false;
		this.suspended = false;
		this.blocked = false;
		this._isBlocked = () => false;
		this._onChange = () => {};
		this._onInvalid = () => {};
		if (typeof watchOptions === "number") {
			this.watchOptions = {
				aggregateTimeout: watchOptions
			};
		} else if (watchOptions && typeof watchOptions === "object") {
			this.watchOptions = { ...watchOptions };
		} else {
			this.watchOptions = {};
		}
		if (typeof this.watchOptions.aggregateTimeout !== "number") {
			this.watchOptions.aggregateTimeout = 200;
		}
		this.compiler = compiler;
		this.running = false;
		this._initial = true;
		this._needRecords = true;
		this._needWatcherInfo = false;
		this.watcher = undefined;
		this.pausedWatcher = undefined;
		this._done = this._done.bind(this);
		process.nextTick(() => {
			if (this._initial) this._invalidate();
		});
	}

	_go() {
		this._initial = false;
		this.startTime = Date.now();
		this.running = true;
		const run = () => {
			if (this.compiler.idle) {
				return this.compiler.cache.endIdle(err => {
					if (err) return this._done(err);
					this.compiler.idle = false;
					run();
				});
			}
			if (this._needRecords) {
				return this.compiler.readRecords(err => {
					if (err) return this._done(err);

					this._needRecords = false;
					run();
				});
			}
			this.invalid = false;
			if (this._needWatcherInfo) {
				this._needWatcherInfo = false;
				const watcher = this.pausedWatcher;
				if (watcher) {
					this.compiler.modifiedFiles = watcher.aggregatedChanges;
					this.compiler.removedFiles = watcher.aggregatedRemovals;
					this.compiler.fileTimestamps = watcher.getFileTimeInfoEntries();
					this.compiler.contextTimestamps = watcher.getContextTimeInfoEntries();
				} else {
					this.compiler.modifiedFiles = undefined;
					this.compiler.removedFiles = undefined;
					this.compiler.fileTimestamps = undefined;
					this.compiler.contextTimestamps = undefined;
				}
			}
			this.compiler.hooks.watchRun.callAsync(this.compiler, err => {
				if (err) return this._done(err);
				const onCompiled = (err, compilation) => {
					if (err) return this._done(err, compilation);
					if (this.invalid) return this._done(null, compilation);

					if (this.compiler.hooks.shouldEmit.call(compilation) === false) {
						return this._done(null, compilation);
					}

					process.nextTick(() => {
						const logger = compilation.getLogger("webpack.Compiler");
						logger.time("emitAssets");
						this.compiler.emitAssets(compilation, err => {
							logger.timeEnd("emitAssets");
							if (err) return this._done(err, compilation);
							if (this.invalid) return this._done(null, compilation);

							logger.time("emitRecords");
							this.compiler.emitRecords(err => {
								logger.timeEnd("emitRecords");
								if (err) return this._done(err, compilation);

								if (compilation.hooks.needAdditionalPass.call()) {
									compilation.needAdditionalPass = true;

									compilation.startTime = this.startTime;
									compilation.endTime = Date.now();
									logger.time("done hook");
									const stats = new Stats(compilation);
									this.compiler.hooks.done.callAsync(stats, err => {
										logger.timeEnd("done hook");
										if (err) return this._done(err, compilation);

										this.compiler.hooks.additionalPass.callAsync(err => {
											if (err) return this._done(err, compilation);
											this.compiler.compile(onCompiled);
										});
									});
									return;
								}
								return this._done(null, compilation);
							});
						});
					});
				};
				this.compiler.compile(onCompiled);
			});
		};

		run();
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {Stats} the compilation stats
	 */
	_getStats(compilation) {
		const stats = new Stats(compilation);
		return stats;
	}

	/**
	 * @param {Error=} err an optional error
	 * @param {Compilation=} compilation the compilation
	 * @returns {void}
	 */
	_done(err, compilation) {
		this.running = false;

		const logger = compilation && compilation.getLogger("webpack.Watching");

		let stats = null;

		const handleError = err => {
			this.compiler.hooks.failed.call(err);
			this.compiler.cache.beginIdle();
			this.compiler.idle = true;
			this.handler(err, stats);
			for (const cb of this.callbacks) cb();
			this.callbacks.length = 0;
		};

		if (
			this.invalid &&
			!this.suspended &&
			!this.blocked &&
			!(this._isBlocked() && (this.blocked = true))
		) {
			if (compilation) {
				logger.time("storeBuildDependencies");
				this.compiler.cache.storeBuildDependencies(
					compilation.buildDependencies,
					err => {
						logger.timeEnd("storeBuildDependencies");
						if (err) return handleError(err);
						this._go();
					}
				);
			} else {
				this._go();
			}
			return;
		}

		if (compilation) {
			compilation.startTime = this.startTime;
			compilation.endTime = Date.now();
			stats = new Stats(compilation);
		}
		if (err) return handleError(err);

		logger.time("done hook");
		this.compiler.hooks.done.callAsync(stats, err => {
			logger.timeEnd("done hook");
			if (err) return handleError(err);
			this.handler(null, stats);
			logger.time("storeBuildDependencies");
			this.compiler.cache.storeBuildDependencies(
				compilation.buildDependencies,
				err => {
					logger.timeEnd("storeBuildDependencies");
					if (err) return handleError(err);
					logger.time("beginIdle");
					this.compiler.cache.beginIdle();
					this.compiler.idle = true;
					logger.timeEnd("beginIdle");
					process.nextTick(() => {
						if (!this.closed) {
							this.watch(
								compilation.fileDependencies,
								compilation.contextDependencies,
								compilation.missingDependencies
							);
						}
					});
					for (const cb of this.callbacks) cb();
					this.callbacks.length = 0;
					this.compiler.hooks.afterDone.call(stats);
				}
			);
		});
	}

	/**
	 * @param {Iterable<string>} files watched files
	 * @param {Iterable<string>} dirs watched directories
	 * @param {Iterable<string>} missing watched existence entries
	 * @returns {void}
	 */
	watch(files, dirs, missing) {
		this.pausedWatcher = null;
		this.watcher = this.compiler.watchFileSystem.watch(
			files,
			dirs,
			missing,
			this.startTime,
			this.watchOptions,
			(
				err,
				fileTimeInfoEntries,
				contextTimeInfoEntries,
				changedFiles,
				removedFiles
			) => {
				this.pausedWatcher = this.watcher;
				this.watcher = null;
				if (err) {
					this.compiler.modifiedFiles = undefined;
					this.compiler.removedFiles = undefined;
					this.compiler.fileTimestamps = undefined;
					this.compiler.contextTimestamps = undefined;
					return this.handler(err);
				}
				this.compiler.fileTimestamps = fileTimeInfoEntries;
				this.compiler.contextTimestamps = contextTimeInfoEntries;
				this.compiler.removedFiles = removedFiles;
				this.compiler.modifiedFiles = changedFiles;
				this._invalidate();
				this._onChange();
			},
			(fileName, changeTime) => {
				this.compiler.hooks.invalid.call(fileName, changeTime);
				this._onInvalid();
			}
		);
	}

	/**
	 * @param {Callback<void>=} callback signals when the build has completed again
	 * @returns {void}
	 */
	invalidate(callback) {
		if (callback) {
			this.callbacks.push(callback);
		}
		if (!this._initial) {
			this.compiler.hooks.invalid.call(null, Date.now());
			this._needWatcherInfo = true;
		}
		this._invalidate();
	}

	_invalidate() {
		if (this.suspended) return;
		if (this._isBlocked()) {
			this.blocked = true;
			return;
		}
		if (this.watcher) {
			this.pausedWatcher = this.watcher;
			this.watcher.pause();
			this.watcher = null;
		}

		if (this.running) {
			this.invalid = true;
		} else {
			this._go();
		}
	}

	suspend() {
		this.suspended = true;
	}

	resume() {
		if (this.suspended) {
			this.suspended = false;
			this._needWatcherInfo = true;
			this._invalidate();
		}
	}

	_checkUnblocked() {
		if (this.blocked && !this._isBlocked()) {
			this.blocked = false;
			this._needWatcherInfo = true;
			this._invalidate();
		}
	}

	/**
	 * @param {Callback<void>} callback signals when the watcher is closed
	 * @returns {void}
	 */
	close(callback) {
		if (this._closeCallbacks) {
			if (callback) {
				this._closeCallbacks.push(callback);
			}
			return;
		}
		const finalCallback = (err, compilation) => {
			this.running = false;
			this.compiler.running = false;
			this.compiler.watching = undefined;
			this.compiler.watchMode = false;
			this.compiler.modifiedFiles = undefined;
			this.compiler.removedFiles = undefined;
			this.compiler.fileTimestamps = undefined;
			this.compiler.contextTimestamps = undefined;
			const shutdown = () => {
				this.compiler.cache.shutdown(err => {
					this.compiler.hooks.watchClose.call();
					const closeCallbacks = this._closeCallbacks;
					this._closeCallbacks = undefined;
					for (const cb of closeCallbacks) cb(err);
				});
			};
			if (compilation) {
				const logger = compilation.getLogger("webpack.Watching");
				logger.time("storeBuildDependencies");
				this.compiler.cache.storeBuildDependencies(
					compilation.buildDependencies,
					err => {
						logger.timeEnd("storeBuildDependencies");
						shutdown();
					}
				);
			} else {
				shutdown();
			}
		};

		this.closed = true;
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}
		if (this.pausedWatcher) {
			this.pausedWatcher.close();
			this.pausedWatcher = null;
		}
		this._closeCallbacks = [];
		if (callback) {
			this._closeCallbacks.push(callback);
		}
		if (this.running) {
			this.invalid = true;
			this._done = finalCallback;
		} else {
			finalCallback();
		}
	}
}

module.exports = Watching;
