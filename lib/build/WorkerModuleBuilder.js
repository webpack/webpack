/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { Worker } = require("worker_threads");
const path = require("path");

/** @typedef {import("../NormalModule")} NormalModule */

/**
 * Pool of worker threads that build NormalModules in parallel.
 *
 * Flow:
 *   1. Main thread sends { resource, request } to a worker
 *   2. Worker: reads file, parses, walks AST, extracts dependencies
 *   3. Worker returns plain dependency descriptors via structured clone
 *   4. Main thread recreates Dependency objects on the original Module
 */
class WorkerModuleBuilder {
	/**
	 * @param {object} options options
	 * @param {number=} options.workers number of worker threads (default: cpu count - 1)
	 * @param {object=} options.parserOptions parser configuration to replicate in workers
	 */
	constructor({ workers, parserOptions } = {}) {
		const os = require("os");
		/** @type {number} */
		this._workerCount = workers || Math.max(1, os.cpus().length - 1);
		/** @type {object} */
		this._parserOptions = parserOptions || {};
		/** @type {Worker[]} */
		this._workers = [];
		/** @type {boolean} */
		this._initialized = false;
		/** @type {Promise<void> | undefined} */
		this._initPromise = undefined;
		/** @type {number} */
		this._nextWorker = 0;
		/** @type {Map<number, { resolve: Function, reject: Function }>} */
		this._pending = new Map();
		/** @type {number} */
		this._nextId = 0;
	}

	/**
	 * Initialize the worker pool. Can be called eagerly — build()
	 * will await the returned promise if workers are not yet ready.
	 * @returns {Promise<void>}
	 */
	initialize() {
		if (this._initialized) return Promise.resolve();
		if (this._initPromise) return this._initPromise;
		this._initPromise = this._doInitialize();
		return this._initPromise;
	}

	/**
	 * @private
	 * @returns {Promise<void>}
	 */
	async _doInitialize() {
		const workerPath = path.resolve(__dirname, "workerModuleBuilder.worker.js");
		const initPromises = [];

		for (let i = 0; i < this._workerCount; i++) {
			const worker = new Worker(workerPath);
			// Don't let workers prevent process exit
			worker.unref();
			this._workers.push(worker);

			worker.on("message", (msg) => {
				this._handleMessage(msg);
			});

			worker.on("error", (err) => {
				for (const [id, { reject }] of this._pending) {
					reject(err);
					this._pending.delete(id);
				}
			});

			initPromises.push(
				new Promise((resolve, reject) => {
					const onMsg = (/** @type {{ type: string }} */ msg) => {
						if (msg.type === "ready") {
							worker.removeListener("message", onMsg);
							resolve(undefined);
						}
					};
					worker.on("message", onMsg);
					worker.postMessage({
						type: "init",
						config: this._parserOptions
					});
				})
			);
		}

		await Promise.all(initPromises);
		this._initialized = true;
	}

	/**
	 * Build a module in a worker thread.
	 * @param {string} resource absolute path to the source file
	 * @param {string} request the full request string
	 * @returns {Promise<object>} plain build result with dependency descriptors
	 */
	build(resource, request) {
		if (!this._initialized) {
			return this.initialize().then(() => this.build(resource, request));
		}

		const id = this._nextId++;
		const worker = this._workers[this._nextWorker];
		this._nextWorker = (this._nextWorker + 1) % this._workers.length;

		return new Promise((resolve, reject) => {
			this._pending.set(id, { resolve, reject });
			worker.postMessage({ type: "build", id, resource, request });
		});
	}

	/**
	 * @param {{ type: string, id?: number, result?: object, error?: string }} msg message
	 */
	_handleMessage(msg) {
		if (msg.type === "result") {
			const pending = this._pending.get(/** @type {number} */ (msg.id));
			if (!pending) return;
			this._pending.delete(/** @type {number} */ (msg.id));
			pending.resolve(msg.result);
		} else if (msg.type === "error") {
			const pending = this._pending.get(/** @type {number} */ (msg.id));
			if (!pending) return;
			this._pending.delete(/** @type {number} */ (msg.id));
			pending.reject(new Error(/** @type {string} */ (msg.error)));
		}
	}

	/**
	 * @returns {Promise<void>}
	 */
	async terminate() {
		await Promise.all(this._workers.map((w) => w.terminate()));
		this._workers.length = 0;
		this._initialized = false;
		this._initPromise = undefined;
	}
}

module.exports = WorkerModuleBuilder;
