/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Stats = require("./Stats");

/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Stats")} Stats */

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
		/** @type {Callback<void>[]} */
		this.closeCallbacks = [];
		this.closed = false;
		this.suspended = false;
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
		this.running = true;
		this.watcher = undefined;
		this.pausedWatcher = undefined;
		this._done = this._done.bind(this);
		this.compiler.readRecords(err => {
			if (err) return this._done(err);

			this._go();
		});
	}

	_go() {
		this.startTime = Date.now();
		this.running = true;
		this.invalid = false;
		this.compiler.cache.endIdle(err => {
			if (err) return this._done(err);
			this.compiler.hooks.watchRun.callAsync(this.compiler, err => {
				if (err) return this._done(err);
				const onCompiled = (err, compilation) => {
					if (err) return this._done(err);
					if (this.invalid) return this._done();

					if (this.compiler.hooks.shouldEmit.call(compilation) === false) {
						return this._done(null, compilation);
					}

					process.nextTick(() => {
						const logger = compilation.getLogger("webpack.Compiler");
						logger.time("emitAssets");
						this.compiler.emitAssets(compilation, err => {
							logger.timeEnd("emitAssets");
							if (err) return this._done(err);
							if (this.invalid) return this._done();

							logger.time("emitRecords");
							this.compiler.emitRecords(err => {
								logger.timeEnd("emitRecords");
								if (err) return this._done(err);

								if (compilation.hooks.needAdditionalPass.call()) {
									compilation.needAdditionalPass = true;

									const stats = new Stats(compilation);
									stats.startTime = this.startTime;
									stats.endTime = Date.now();
									logger.time("done hook");
									this.compiler.hooks.done.callAsync(stats, err => {
										logger.timeEnd("done hook");
										if (err) return this._done(err);

										this.compiler.hooks.additionalPass.callAsync(err => {
											if (err) return this._done(err);
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
		});
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {Stats} the compilation stats
	 */
	_getStats(compilation) {
		const stats = new Stats(compilation);
		stats.startTime = this.startTime;
		stats.endTime = Date.now();
		return stats;
	}

	/**
	 * @param {Error=} err an optional error
	 * @param {Compilation=} compilation the compilation
	 * @returns {void}
	 */
	_done(err, compilation) {
		this.running = false;
		if (this.invalid) return this._go();

		const stats = compilation ? this._getStats(compilation) : null;
		if (err) {
			this.compiler.hooks.failed.call(err);
			this.compiler.cache.beginIdle();
			this.handler(err, stats);
			return;
		}

		const logger = compilation.getLogger("webpack.Watching");
		logger.time("done hook");
		this.compiler.hooks.done.callAsync(stats, () => {
			logger.timeEnd("done hook");
			logger.time("beginIdle");
			this.compiler.cache.beginIdle();
			logger.timeEnd("beginIdle");
			this.handler(null, stats);
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
				if (!this.suspended) {
					this._invalidate();
				}
			},
			(fileName, changeTime) => {
				this.compiler.hooks.invalid.call(fileName, changeTime);
			}
		);
	}

	/**
	 * @param {Callback<void>=} callback signals when the build is invalidated
	 * @returns {void}
	 */
	invalidate(callback) {
		if (callback) {
			this.callbacks.push(callback);
		}
		if (this.watcher) {
			this.compiler.modifiedFiles = this.watcher.aggregatedChanges;
			this.compiler.removedFiles = this.watcher.aggregatedRemovals;
			this.compiler.fileTimestamps = this.watcher.getFileTimeInfoEntries();
			this.compiler.contextTimestamps = this.watcher.getContextTimeInfoEntries();
		}
		this._invalidate();
	}

	_invalidate() {
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
		this.invalid = false;
	}

	resume() {
		if (this.suspended) {
			this.suspended = false;
			this._invalidate();
		}
	}

	/**
	 * @param {Callback<void>} callback signals when the watcher is closed
	 * @returns {void}
	 */
	close(callback) {
		const finalCallback = () => {
			this.running = false;
			this.compiler.running = false;
			this.compiler.watchMode = false;
			this.compiler.modifiedFiles = undefined;
			this.compiler.removedFiles = undefined;
			this.compiler.fileTimestamps = undefined;
			this.compiler.contextTimestamps = undefined;
			this.compiler.cache.shutdown(err => {
				this.compiler.hooks.watchClose.call();
				for (const cb of this.closeCallbacks) cb(err);
				this.closeCallbacks.length = 0;
			});
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
		if (callback) {
			this.closeCallbacks.push(callback);
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
