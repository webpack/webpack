/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook, AsyncSeriesHook } = require("tapable");

const QUEUED_STATE = 0;
const PROCESSING_STATE = 1;
const DONE_STATE = 2;

let inHandleResult = 0;

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} result
 */

/**
 * @template T
 * @template K
 * @template R
 */
class AsyncQueueEntry {
	/**
	 * @param {T} item the item
	 * @param {Callback<R>} callback the callback
	 */
	constructor(item, callback) {
		this.item = item;
		/** @type {typeof QUEUED_STATE | typeof PROCESSING_STATE | typeof DONE_STATE} */
		this.state = QUEUED_STATE;
		this.callback = callback;
		/** @type {Callback<R>[] | undefined} */
		this.callbacks = undefined;
		this.result = undefined;
		this.error = undefined;
	}
}

/**
 * @template T
 * @template K
 * @template R
 */
class AsyncQueue {
	/**
	 * @param {Object} options options object
	 * @param {string=} options.name name of the queue
	 * @param {number} options.parallelism how many items should be processed at once
	 * @param {function(T): K=} options.getKey extract key from item
	 * @param {function(T, Callback<R>): void} options.processor async function to process items
	 */
	constructor({ name, parallelism, processor, getKey }) {
		this._name = name;
		this._parallelism = parallelism;
		this._processor = processor;
		this._getKey =
			getKey || /** @type {(T) => K} */ (item => /** @type {any} */ (item));
		/** @type {Map<K, AsyncQueueEntry<T, K, R>>} */
		this._entries = new Map();
		/** @type {AsyncQueueEntry<T, K, R>[]} */
		this._queued = [];
		this._activeTasks = 0;
		this._willEnsureProcessing = false;
		this._stopped = false;

		this.hooks = {
			/** @type {AsyncSeriesHook<[T]>} */
			beforeAdd: new AsyncSeriesHook(["item"]),
			/** @type {SyncHook<[T]>} */
			added: new SyncHook(["item"]),
			/** @type {AsyncSeriesHook<[T]>} */
			beforeStart: new AsyncSeriesHook(["item"]),
			/** @type {SyncHook<[T]>} */
			started: new SyncHook(["item"]),
			/** @type {SyncHook<[T, Error, R]>} */
			result: new SyncHook(["item", "error", "result"])
		};

		this._ensureProcessing = this._ensureProcessing.bind(this);
	}

	/**
	 * @param {T} item a item
	 * @param {Callback<R>} callback callback function
	 * @returns {void}
	 */
	add(item, callback) {
		if (this._stopped) return callback(new Error("Queue was stopped"));
		this.hooks.beforeAdd.callAsync(item, err => {
			if (err) {
				callback(err);
				return;
			}
			const key = this._getKey(item);
			const entry = this._entries.get(key);
			if (entry !== undefined) {
				if (entry.state === DONE_STATE) {
					process.nextTick(() => callback(entry.error, entry.result));
				} else if (entry.callbacks === undefined) {
					entry.callbacks = [callback];
				} else {
					entry.callbacks.push(callback);
				}
				return;
			}
			const newEntry = new AsyncQueueEntry(item, callback);
			if (this._stopped) {
				this.hooks.added.call(item);
				this._activeTasks++;
				process.nextTick(() =>
					this._handleResult(newEntry, new Error("Queue was stopped"))
				);
			} else {
				this._entries.set(key, newEntry);
				this._queued.push(newEntry);
				if (this._willEnsureProcessing === false) {
					this._willEnsureProcessing = true;
					setImmediate(this._ensureProcessing);
				}
				this.hooks.added.call(item);
			}
		});
	}

	/**
	 * @param {T} item a item
	 * @returns {void}
	 */
	invalidate(item) {
		const key = this._getKey(item);
		const entry = this._entries.get(key);
		this._entries.delete(key);
		if (entry.state === QUEUED_STATE) {
			const idx = this._queued.indexOf(entry);
			if (idx >= 0) {
				this._queued.splice(idx, 1);
			}
		}
	}

	/**
	 * @returns {void}
	 */
	stop() {
		this._stopped = true;
		const queue = this._queued;
		this._queued = [];
		for (const entry of queue) {
			this._entries.delete(this._getKey(entry.item));
			this._activeTasks++;
			this._handleResult(entry, new Error("Queue was stopped"));
		}
	}

	/**
	 * @returns {void}
	 */
	increaseParallelism() {
		this._parallelism++;
		/* istanbul ignore next */
		if (this._willEnsureProcessing === false && this._queued.length > 0) {
			this._willEnsureProcessing = true;
			setImmediate(this._ensureProcessing);
		}
	}

	/**
	 * @returns {void}
	 */
	decreaseParallelism() {
		this._parallelism--;
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, if the item is currently being processed
	 */
	isProcessing(item) {
		const key = this._getKey(item);
		const entry = this._entries.get(key);
		return entry !== undefined && entry.state === PROCESSING_STATE;
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, if the item is currently queued
	 */
	isQueued(item) {
		const key = this._getKey(item);
		const entry = this._entries.get(key);
		return entry !== undefined && entry.state === QUEUED_STATE;
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, if the item is currently queued
	 */
	isDone(item) {
		const key = this._getKey(item);
		const entry = this._entries.get(key);
		return entry !== undefined && entry.state === DONE_STATE;
	}

	/**
	 * @returns {void}
	 */
	_ensureProcessing() {
		while (this._activeTasks < this._parallelism && this._queued.length > 0) {
			const entry = this._queued.pop();
			this._activeTasks++;
			entry.state = PROCESSING_STATE;
			this._startProcessing(entry);
		}
		this._willEnsureProcessing = false;
	}

	/**
	 * @param {AsyncQueueEntry<T, K, R>} entry the entry
	 * @returns {void}
	 */
	_startProcessing(entry) {
		this.hooks.beforeStart.callAsync(entry.item, err => {
			if (err) {
				this._handleResult(entry, err);
				return;
			}
			let inCallback = false;
			try {
				this._processor(entry.item, (e, r) => {
					inCallback = true;
					this._handleResult(entry, e, r);
				});
			} catch (err) {
				if (inCallback) throw err;
				this._handleResult(entry, err, null);
			}
			this.hooks.started.call(entry.item);
		});
	}

	/**
	 * @param {AsyncQueueEntry<T, K, R>} entry the entry
	 * @param {Error=} err error, if any
	 * @param {R=} result result, if any
	 * @returns {void}
	 */
	_handleResult(entry, err, result) {
		this.hooks.result.callAsync(entry.item, err, result, hookError => {
			const error = hookError || err;

			const callback = entry.callback;
			const callbacks = entry.callbacks;
			entry.state = DONE_STATE;
			entry.callback = undefined;
			entry.callbacks = undefined;
			entry.result = result;
			entry.error = error;
			this._activeTasks--;

			if (this._willEnsureProcessing === false && this._queued.length > 0) {
				this._willEnsureProcessing = true;
				setImmediate(this._ensureProcessing);
			}

			if (inHandleResult++ > 3) {
				process.nextTick(() => {
					callback(error, result);
					if (callbacks !== undefined) {
						for (const callback of callbacks) {
							callback(error, result);
						}
					}
				});
			} else {
				callback(error, result);
				if (callbacks !== undefined) {
					for (const callback of callbacks) {
						callback(error, result);
					}
				}
			}
			inHandleResult--;
		});
	}
}

module.exports = AsyncQueue;
