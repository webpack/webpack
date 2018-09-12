/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook, AsyncSeriesHook } = require("tapable");

/** @template R @typedef {(err?: Error|null, result?: R) => void} Callback<T> */

/**
 * @template T
 * @template R
 */
class AsyncQueue {
	/**
	 * @param {Object} options options object
	 * @param {string=} options.name name of the queue
	 * @param {number} options.parallelism how many items should be processed at once
	 * @param {function(T, Callback<R>): void} options.processor async function to process items
	 */
	constructor({ name, parallelism, processor }) {
		this._name = name;
		this._parallelism = parallelism;
		this._processor = processor;
		/** @type {Map<T, Callback<R>[]>} */
		this._callbacks = new Map();
		/** @type {Set<T>} */
		this._queued = new Set();
		/** @type {Set<T>} */
		this._processing = new Set();
		/** @type {Map<T, [Error, R]>} */
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
			const result = this._results.get(item);
			if (result !== undefined) {
				process.nextTick(() => callback(result[0], result[1]));
				return;
			}
			let callbacks = this._callbacks.get(item);
			if (callbacks !== undefined) {
				callbacks.push(callback);
				return;
			}
			callbacks = [callback];
			this._callbacks.set(item, callbacks);
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
		this._results.delete(item);
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
		return this._processing.has(item);
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
		return this._results.has(item);
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
			this._queued.delete(item);
			this._processing.add(item);
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
				console.error(err);
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

			const callbacks = this._callbacks.get(item);
			this._processing.delete(item);
			this._results.set(item, [error, result]);
			this._callbacks.delete(item);
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
