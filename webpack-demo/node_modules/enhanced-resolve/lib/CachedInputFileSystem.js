/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const nextTick = require("process").nextTick;

/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").PathLike} PathLike */
/** @typedef {import("./Resolver").PathOrFileDescriptor} PathOrFileDescriptor */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */
/** @typedef {FileSystem & SyncFileSystem} BaseFileSystem */

/**
 * @template T
 * @typedef {import("./Resolver").FileSystemCallback<T>} FileSystemCallback<T>
 */

/**
 * @param {string} path path
 * @returns {string} dirname
 */
const dirname = path => {
	let idx = path.length - 1;
	while (idx >= 0) {
		const c = path.charCodeAt(idx);
		// slash or backslash
		if (c === 47 || c === 92) break;
		idx--;
	}
	if (idx < 0) return "";
	return path.slice(0, idx);
};

/**
 * @template T
 * @param {FileSystemCallback<T>[]} callbacks callbacks
 * @param {Error | null} err error
 * @param {T} result result
 */
const runCallbacks = (callbacks, err, result) => {
	if (callbacks.length === 1) {
		callbacks[0](err, result);
		callbacks.length = 0;
		return;
	}
	let error;
	for (const callback of callbacks) {
		try {
			callback(err, result);
		} catch (e) {
			if (!error) error = e;
		}
	}
	callbacks.length = 0;
	if (error) throw error;
};

class OperationMergerBackend {
	/**
	 * @param {Function | undefined} provider async method in filesystem
	 * @param {Function | undefined} syncProvider sync method in filesystem
	 * @param {BaseFileSystem} providerContext call context for the provider methods
	 */
	constructor(provider, syncProvider, providerContext) {
		this._provider = provider;
		this._syncProvider = syncProvider;
		this._providerContext = providerContext;
		this._activeAsyncOperations = new Map();

		this.provide = this._provider
			? /**
			   * @param {PathLike | PathOrFileDescriptor} path path
			   * @param {object | FileSystemCallback<any> | undefined} options options
			   * @param {FileSystemCallback<any>=} callback callback
			   * @returns {any} result
			   */
			  (path, options, callback) => {
					if (typeof options === "function") {
						callback = /** @type {FileSystemCallback<any>} */ (options);
						options = undefined;
					}
					if (
						typeof path !== "string" &&
						!Buffer.isBuffer(path) &&
						!(path instanceof URL) &&
						typeof path !== "number"
					) {
						/** @type {Function} */
						(callback)(
							new TypeError("path must be a string, Buffer, URL or number")
						);
						return;
					}
					if (options) {
						return /** @type {Function} */ (this._provider).call(
							this._providerContext,
							path,
							options,
							callback
						);
					}
					let callbacks = this._activeAsyncOperations.get(path);
					if (callbacks) {
						callbacks.push(callback);
						return;
					}
					this._activeAsyncOperations.set(path, (callbacks = [callback]));
					/** @type {Function} */
					(provider)(
						path,
						/**
						 * @param {Error} err error
						 * @param {any} result result
						 */
						(err, result) => {
							this._activeAsyncOperations.delete(path);
							runCallbacks(callbacks, err, result);
						}
					);
			  }
			: null;
		this.provideSync = this._syncProvider
			? /**
			   * @param {PathLike | PathOrFileDescriptor} path path
			   * @param {object=} options options
			   * @returns {any} result
			   */
			  (path, options) => {
					return /** @type {Function} */ (this._syncProvider).call(
						this._providerContext,
						path,
						options
					);
			  }
			: null;
	}

	purge() {}
	purgeParent() {}
}

/*

IDLE:
	insert data: goto SYNC

SYNC:
	before provide: run ticks
	event loop tick: goto ASYNC_ACTIVE

ASYNC:
	timeout: run tick, goto ASYNC_PASSIVE

ASYNC_PASSIVE:
	before provide: run ticks

IDLE --[insert data]--> SYNC --[event loop tick]--> ASYNC_ACTIVE --[interval tick]-> ASYNC_PASSIVE
                                                          ^                             |
                                                          +---------[insert data]-------+
*/

const STORAGE_MODE_IDLE = 0;
const STORAGE_MODE_SYNC = 1;
const STORAGE_MODE_ASYNC = 2;

/**
 * @callback Provide
 * @param {PathLike | PathOrFileDescriptor} path path
 * @param {any} options options
 * @param {FileSystemCallback<any>} callback callback
 * @returns {void}
 */

class CacheBackend {
	/**
	 * @param {number} duration max cache duration of items
	 * @param {function | undefined} provider async method
	 * @param {function | undefined} syncProvider sync method
	 * @param {BaseFileSystem} providerContext call context for the provider methods
	 */
	constructor(duration, provider, syncProvider, providerContext) {
		this._duration = duration;
		this._provider = provider;
		this._syncProvider = syncProvider;
		this._providerContext = providerContext;
		/** @type {Map<string, FileSystemCallback<any>[]>} */
		this._activeAsyncOperations = new Map();
		/** @type {Map<string, { err: Error | null, result?: any, level: Set<string> }>} */
		this._data = new Map();
		/** @type {Set<string>[]} */
		this._levels = [];
		for (let i = 0; i < 10; i++) this._levels.push(new Set());
		for (let i = 5000; i < duration; i += 500) this._levels.push(new Set());
		this._currentLevel = 0;
		this._tickInterval = Math.floor(duration / this._levels.length);
		/** @type {STORAGE_MODE_IDLE | STORAGE_MODE_SYNC | STORAGE_MODE_ASYNC} */
		this._mode = STORAGE_MODE_IDLE;

		/** @type {NodeJS.Timeout | undefined} */
		this._timeout = undefined;
		/** @type {number | undefined} */
		this._nextDecay = undefined;

		// @ts-ignore
		this.provide = provider ? this.provide.bind(this) : null;
		// @ts-ignore
		this.provideSync = syncProvider ? this.provideSync.bind(this) : null;
	}

	/**
	 * @param {PathLike | PathOrFileDescriptor} path path
	 * @param {any} options options
	 * @param {FileSystemCallback<any>} callback callback
	 * @returns {void}
	 */
	provide(path, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = undefined;
		}
		if (
			typeof path !== "string" &&
			!Buffer.isBuffer(path) &&
			!(path instanceof URL) &&
			typeof path !== "number"
		) {
			callback(new TypeError("path must be a string, Buffer, URL or number"));
			return;
		}
		const strPath = typeof path !== "string" ? path.toString() : path;
		if (options) {
			return /** @type {Function} */ (this._provider).call(
				this._providerContext,
				path,
				options,
				callback
			);
		}

		// When in sync mode we can move to async mode
		if (this._mode === STORAGE_MODE_SYNC) {
			this._enterAsyncMode();
		}

		// Check in cache
		let cacheEntry = this._data.get(strPath);
		if (cacheEntry !== undefined) {
			if (cacheEntry.err) return nextTick(callback, cacheEntry.err);
			return nextTick(callback, null, cacheEntry.result);
		}

		// Check if there is already the same operation running
		let callbacks = this._activeAsyncOperations.get(strPath);
		if (callbacks !== undefined) {
			callbacks.push(callback);
			return;
		}
		this._activeAsyncOperations.set(strPath, (callbacks = [callback]));

		// Run the operation
		/** @type {Function} */
		(this._provider).call(
			this._providerContext,
			path,
			/**
			 * @param {Error | null} err error
			 * @param {any} [result] result
			 */
			(err, result) => {
				this._activeAsyncOperations.delete(strPath);
				this._storeResult(strPath, err, result);

				// Enter async mode if not yet done
				this._enterAsyncMode();

				runCallbacks(
					/** @type {FileSystemCallback<any>[]} */ (callbacks),
					err,
					result
				);
			}
		);
	}

	/**
	 * @param {PathLike | PathOrFileDescriptor} path path
	 * @param {any} options options
	 * @returns {any} result
	 */
	provideSync(path, options) {
		if (
			typeof path !== "string" &&
			!Buffer.isBuffer(path) &&
			!(path instanceof URL) &&
			typeof path !== "number"
		) {
			throw new TypeError("path must be a string");
		}
		const strPath = typeof path !== "string" ? path.toString() : path;
		if (options) {
			return /** @type {Function} */ (this._syncProvider).call(
				this._providerContext,
				path,
				options
			);
		}

		// In sync mode we may have to decay some cache items
		if (this._mode === STORAGE_MODE_SYNC) {
			this._runDecays();
		}

		// Check in cache
		let cacheEntry = this._data.get(strPath);
		if (cacheEntry !== undefined) {
			if (cacheEntry.err) throw cacheEntry.err;
			return cacheEntry.result;
		}

		// Get all active async operations
		// This sync operation will also complete them
		const callbacks = this._activeAsyncOperations.get(strPath);
		this._activeAsyncOperations.delete(strPath);

		// Run the operation
		// When in idle mode, we will enter sync mode
		let result;
		try {
			result = /** @type {Function} */ (this._syncProvider).call(
				this._providerContext,
				path
			);
		} catch (err) {
			this._storeResult(strPath, /** @type {Error} */ (err), undefined);
			this._enterSyncModeWhenIdle();
			if (callbacks) {
				runCallbacks(callbacks, /** @type {Error} */ (err), undefined);
			}
			throw err;
		}
		this._storeResult(strPath, null, result);
		this._enterSyncModeWhenIdle();
		if (callbacks) {
			runCallbacks(callbacks, null, result);
		}
		return result;
	}

	/**
	 * @param {string | Buffer | URL | number | (string | URL | Buffer | number)[] | Set<string | URL | Buffer | number>} [what] what to purge
	 */
	purge(what) {
		if (!what) {
			if (this._mode !== STORAGE_MODE_IDLE) {
				this._data.clear();
				for (const level of this._levels) {
					level.clear();
				}
				this._enterIdleMode();
			}
		} else if (
			typeof what === "string" ||
			Buffer.isBuffer(what) ||
			what instanceof URL ||
			typeof what === "number"
		) {
			const strWhat = typeof what !== "string" ? what.toString() : what;
			for (let [key, data] of this._data) {
				if (key.startsWith(strWhat)) {
					this._data.delete(key);
					data.level.delete(key);
				}
			}
			if (this._data.size === 0) {
				this._enterIdleMode();
			}
		} else {
			for (let [key, data] of this._data) {
				for (const item of what) {
					const strItem = typeof item !== "string" ? item.toString() : item;
					if (key.startsWith(strItem)) {
						this._data.delete(key);
						data.level.delete(key);
						break;
					}
				}
			}
			if (this._data.size === 0) {
				this._enterIdleMode();
			}
		}
	}

	/**
	 * @param {string | Buffer | URL | number | (string | URL | Buffer | number)[] | Set<string | URL | Buffer | number>} [what] what to purge
	 */
	purgeParent(what) {
		if (!what) {
			this.purge();
		} else if (
			typeof what === "string" ||
			Buffer.isBuffer(what) ||
			what instanceof URL ||
			typeof what === "number"
		) {
			const strWhat = typeof what !== "string" ? what.toString() : what;
			this.purge(dirname(strWhat));
		} else {
			const set = new Set();
			for (const item of what) {
				const strItem = typeof item !== "string" ? item.toString() : item;
				set.add(dirname(strItem));
			}
			this.purge(set);
		}
	}

	/**
	 * @param {string} path path
	 * @param {Error | null} err error
	 * @param {any} result result
	 */
	_storeResult(path, err, result) {
		if (this._data.has(path)) return;
		const level = this._levels[this._currentLevel];
		this._data.set(path, { err, result, level });
		level.add(path);
	}

	_decayLevel() {
		const nextLevel = (this._currentLevel + 1) % this._levels.length;
		const decay = this._levels[nextLevel];
		this._currentLevel = nextLevel;
		for (let item of decay) {
			this._data.delete(item);
		}
		decay.clear();
		if (this._data.size === 0) {
			this._enterIdleMode();
		} else {
			/** @type {number} */
			(this._nextDecay) += this._tickInterval;
		}
	}

	_runDecays() {
		while (
			/** @type {number} */ (this._nextDecay) <= Date.now() &&
			this._mode !== STORAGE_MODE_IDLE
		) {
			this._decayLevel();
		}
	}

	_enterAsyncMode() {
		let timeout = 0;
		switch (this._mode) {
			case STORAGE_MODE_ASYNC:
				return;
			case STORAGE_MODE_IDLE:
				this._nextDecay = Date.now() + this._tickInterval;
				timeout = this._tickInterval;
				break;
			case STORAGE_MODE_SYNC:
				this._runDecays();
				// _runDecays may change the mode
				if (
					/** @type {STORAGE_MODE_IDLE | STORAGE_MODE_SYNC | STORAGE_MODE_ASYNC}*/
					(this._mode) === STORAGE_MODE_IDLE
				)
					return;
				timeout = Math.max(
					0,
					/** @type {number} */ (this._nextDecay) - Date.now()
				);
				break;
		}
		this._mode = STORAGE_MODE_ASYNC;
		const ref = setTimeout(() => {
			this._mode = STORAGE_MODE_SYNC;
			this._runDecays();
		}, timeout);
		if (ref.unref) ref.unref();
		this._timeout = ref;
	}

	_enterSyncModeWhenIdle() {
		if (this._mode === STORAGE_MODE_IDLE) {
			this._mode = STORAGE_MODE_SYNC;
			this._nextDecay = Date.now() + this._tickInterval;
		}
	}

	_enterIdleMode() {
		this._mode = STORAGE_MODE_IDLE;
		this._nextDecay = undefined;
		if (this._timeout) clearTimeout(this._timeout);
	}
}

/**
 * @template {function} Provider
 * @template {function} AsyncProvider
 * @template FileSystem
 * @param {number} duration duration in ms files are cached
 * @param {Provider | undefined} provider provider
 * @param {AsyncProvider | undefined} syncProvider sync provider
 * @param {BaseFileSystem} providerContext provider context
 * @returns {OperationMergerBackend | CacheBackend} backend
 */
const createBackend = (duration, provider, syncProvider, providerContext) => {
	if (duration > 0) {
		return new CacheBackend(duration, provider, syncProvider, providerContext);
	}
	return new OperationMergerBackend(provider, syncProvider, providerContext);
};

module.exports = class CachedInputFileSystem {
	/**
	 * @param {BaseFileSystem} fileSystem file system
	 * @param {number} duration duration in ms files are cached
	 */
	constructor(fileSystem, duration) {
		this.fileSystem = fileSystem;

		this._lstatBackend = createBackend(
			duration,
			this.fileSystem.lstat,
			this.fileSystem.lstatSync,
			this.fileSystem
		);
		const lstat = this._lstatBackend.provide;
		this.lstat = /** @type {FileSystem["lstat"]} */ (lstat);
		const lstatSync = this._lstatBackend.provideSync;
		this.lstatSync = /** @type {SyncFileSystem["lstatSync"]} */ (lstatSync);

		this._statBackend = createBackend(
			duration,
			this.fileSystem.stat,
			this.fileSystem.statSync,
			this.fileSystem
		);
		const stat = this._statBackend.provide;
		this.stat = /** @type {FileSystem["stat"]} */ (stat);
		const statSync = this._statBackend.provideSync;
		this.statSync = /** @type {SyncFileSystem["statSync"]} */ (statSync);

		this._readdirBackend = createBackend(
			duration,
			this.fileSystem.readdir,
			this.fileSystem.readdirSync,
			this.fileSystem
		);
		const readdir = this._readdirBackend.provide;
		this.readdir = /** @type {FileSystem["readdir"]} */ (readdir);
		const readdirSync = this._readdirBackend.provideSync;
		this.readdirSync = /** @type {SyncFileSystem["readdirSync"]} */ (
			readdirSync
		);

		this._readFileBackend = createBackend(
			duration,
			this.fileSystem.readFile,
			this.fileSystem.readFileSync,
			this.fileSystem
		);
		const readFile = this._readFileBackend.provide;
		this.readFile = /** @type {FileSystem["readFile"]} */ (readFile);
		const readFileSync = this._readFileBackend.provideSync;
		this.readFileSync = /** @type {SyncFileSystem["readFileSync"]} */ (
			readFileSync
		);

		this._readJsonBackend = createBackend(
			duration,
			// prettier-ignore
			this.fileSystem.readJson ||
				(this.readFile &&
					(
						/**
						 * @param {string} path path
						 * @param {FileSystemCallback<any>} callback
						 */
						(path, callback) => {
							this.readFile(path, (err, buffer) => {
								if (err) return callback(err);
								if (!buffer || buffer.length === 0)
									return callback(new Error("No file content"));
								let data;
								try {
									data = JSON.parse(buffer.toString("utf-8"));
								} catch (e) {
									return callback(/** @type {Error} */ (e));
								}
								callback(null, data);
							});
						})
				),
			// prettier-ignore
			this.fileSystem.readJsonSync ||
				(this.readFileSync &&
					(
						/**
						 * @param {string} path path
						 * @returns {any} result
						 */
						(path) => {
							const buffer = this.readFileSync(path);
							const data = JSON.parse(buffer.toString("utf-8"));
							return data;
						}
				 )),
			this.fileSystem
		);
		const readJson = this._readJsonBackend.provide;
		this.readJson = /** @type {FileSystem["readJson"]} */ (readJson);
		const readJsonSync = this._readJsonBackend.provideSync;
		this.readJsonSync = /** @type {SyncFileSystem["readJsonSync"]} */ (
			readJsonSync
		);

		this._readlinkBackend = createBackend(
			duration,
			this.fileSystem.readlink,
			this.fileSystem.readlinkSync,
			this.fileSystem
		);
		const readlink = this._readlinkBackend.provide;
		this.readlink = /** @type {FileSystem["readlink"]} */ (readlink);
		const readlinkSync = this._readlinkBackend.provideSync;
		this.readlinkSync = /** @type {SyncFileSystem["readlinkSync"]} */ (
			readlinkSync
		);

		this._realpathBackend = createBackend(
			duration,
			this.fileSystem.realpath,
			this.fileSystem.realpathSync,
			this.fileSystem
		);
		const realpath = this._realpathBackend.provide;
		this.realpath = /** @type {FileSystem["realpath"]} */ (realpath);
		const realpathSync = this._realpathBackend.provideSync;
		this.realpathSync = /** @type {SyncFileSystem["realpathSync"]} */ (
			realpathSync
		);
	}

	/**
	 * @param {string | Buffer | URL | number | (string | URL | Buffer | number)[] | Set<string | URL | Buffer | number>} [what] what to purge
	 */
	purge(what) {
		this._statBackend.purge(what);
		this._lstatBackend.purge(what);
		this._readdirBackend.purgeParent(what);
		this._readFileBackend.purge(what);
		this._readlinkBackend.purge(what);
		this._readJsonBackend.purge(what);
		this._realpathBackend.purge(what);
	}
};
