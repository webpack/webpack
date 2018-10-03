/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook, AsyncSeriesHook } = require("tapable");

/** @template R @typedef {(err?: Error|null, result?: R) => void} Callback<T> */

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
		/** @type {Map<K, Callback<R>[]>} */
		this._callbacks = new Map();
		/** @type {Set<T>} */
		this._queued = new Set();
		/** @type {Set<K>} */
		this._processing = new Set();
		/** @type {Map<K, [Error, R]>} */
		this._results = new Map();
		this._activeTasks = 0;
		this._willEnsureProcessing = false;
		this._stopped = false;

		this.hooks = {
			beforeAdd: new AsyncSeriesHook(["item"]),
			added: new SyncHook(["item"]),
			beforeStart: new AsyncSeriesHook(["item"]),
			started: new SyncHook(["item"]),
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
			const result = this._results.get(key);
			if (result !== undefined) {
				process.nextTick(() => callback(result[0], result[1]));
				return;
			}
			let callbacks = this._callbacks.get(key);
			if (callbacks !== undefined) {
				callbacks.push(callback);
				return;
			}
			callbacks = [callback];
			this._callbacks.set(key, callbacks);
			if (this._stopped) {
				this.hooks.added.call(item);
				this._activeTasks++;
				this._handleResult(item, new Error("Queue was stopped"));
			} else {
				this._queued.add(item);
				if (this._willEnsureProcessing === false) {
					this._willEnsureProcessing = true;
					process.nextTick(this._ensureProcessing);
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
		this._results.delete(key);
	}

	/**
	 * @returns {void}
	 */
	stop() {
		this._stopped = true;
		for (const item of this._queued) {
			this._activeTasks++;
			this._queued.delete(item);
			this._handleResult(item, new Error("Queue was stopped"));
		}
	}

	/**
	 * @returns {void}
	 */
	increaseParallelism() {
		this._parallelism++;
		if (this._willEnsureProcessing === false && this._queued.size > 0) {
			this._willEnsureProcessing = true;
			process.nextTick(this._ensureProcessing);
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
		return this._processing.has(key);
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, if the item is currently queued
	 */
	isQueued(item) {
		return this._queued.has(item);
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, if the item is currently queued
	 */
	isDone(item) {
		const key = this._getKey(item);
		return this._results.has(key);
	}

	/**
	 * @returns {void}
	 */
	_ensureProcessing() {
		if (this._activeTasks >= this._parallelism) {
			this._willEnsureProcessing = false;
			return;
		}
		for (const item of this._queued) {
			this._activeTasks++;
			const key = this._getKey(item);
			this._queued.delete(item);
			this._processing.add(key);
			this._startProcessing(item);
			if (this._activeTasks >= this._parallelism) {
				this._willEnsureProcessing = false;
				return;
			}
		}
		this._willEnsureProcessing = false;
	}

	/**
	 * @param {T} item an item
	 * @returns {void}
	 */
	_startProcessing(item) {
		this.hooks.beforeStart.callAsync(item, err => {
			if (err) {
				this._handleResult(item, err);
				return;
			}
			try {
				this._processor(item, (e, r) => {
					process.nextTick(() => {
						this._handleResult(item, e, r);
					});
				});
			} catch (err) {
				this._handleResult(item, err, null);
			}
			this.hooks.started.call(item);
		});
	}

	/**
	 * @param {T} item an item
	 * @param {Error=} err error, if any
	 * @param {R=} result result, if any
	 * @returns {void}
	 */
	_handleResult(item, err, result) {
		this.hooks.result.callAsync(item, err, result, hookError => {
			const error = hookError || err;

			const key = this._getKey(item);
			const callbacks = this._callbacks.get(key);
			this._processing.delete(key);
			this._results.set(key, [error, result]);
			this._callbacks.delete(key);
			this._activeTasks--;

			if (this._willEnsureProcessing === false && this._queued.size > 0) {
				this._willEnsureProcessing = true;
				process.nextTick(this._ensureProcessing);
			}

			for (const callback of callbacks) {
				callback(error, result);
			}
		});
	}
}

module.exports = AsyncQueue;
