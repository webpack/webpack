/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Based on thread-loader WorkerPool by @sokra
*/

"use strict";

const os = require("os");
const ThreadWorkerBackend = require("./ThreadWorkerBackend");
const WorkerPoolWorker = require("./WorkerPoolWorker");

/** @typedef {import("./WorkerBackend")} WorkerBackend */

/**
 * @typedef {object} WorkerPoolOptions
 * @property {number=} numberOfWorkers max workers (default: cpus - 1)
 * @property {number=} poolTimeout ms to keep idle workers alive (default: 500)
 * @property {EXPECTED_ANY=} workerData data passed to worker constructor
 * @property {((workerPath: string, workerData: EXPECTED_ANY) => WorkerBackend)=} createBackend custom backend factory
 */

class WorkerPool {
	/**
	 * @param {string} workerPath absolute path to the worker script
	 * @param {WorkerPoolOptions=} options pool options
	 */
	constructor(workerPath, options) {
		const opts = options || {};
		this.workerPath = workerPath;
		/** @type {number} */
		this.numberOfWorkers =
			opts.numberOfWorkers || Math.max(1, (os.cpus() || []).length - 1);
		/** @type {number} */
		this.poolTimeout = opts.poolTimeout !== undefined ? opts.poolTimeout : 500;
		/** @type {EXPECTED_ANY} */
		this.workerData = opts.workerData;
		/** @type {(workerPath: string, workerData: EXPECTED_ANY) => WorkerBackend} */
		this.createBackend =
			opts.createBackend || ((wp, wd) => new ThreadWorkerBackend(wp, wd));
		/** @type {Set<WorkerPoolWorker>} */
		this.workers = new Set();
		/** @type {number} */
		this.activeJobs = 0;
		/** @type {ReturnType<typeof setTimeout> | null} */
		this.timeout = null;
		/** @type {boolean} */
		this.terminated = false;
	}

	/**
	 * Submit a job to the pool.
	 * Workers are created on demand up to `numberOfWorkers`.
	 * @param {EXPECTED_ANY} data job data (passed to worker via postMessage)
	 * @returns {Promise<EXPECTED_ANY>} job result
	 */
	run(data) {
		if (this.terminated) {
			return Promise.reject(new Error("WorkerPool has been terminated"));
		}
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
		this.activeJobs++;
		const worker = this._getWorker();
		return worker.run(data).finally(() => {
			this.activeJobs--;
			this._scheduleDispose();
		});
	}

	/**
	 * Pre-create workers and send warmup data.
	 * @param {EXPECTED_ANY=} data warmup data
	 */
	warmup(data) {
		while (this.workers.size < this.numberOfWorkers) {
			const worker = this._createWorker();
			if (data !== undefined) worker.warmup(data);
		}
	}

	/**
	 * Select the worker with fewest active jobs, or create a new one.
	 * @returns {WorkerPoolWorker} worker
	 */
	_getWorker() {
		/** @type {WorkerPoolWorker | undefined} */
		let best;
		for (const worker of this.workers) {
			if (!best || worker.activeJobs < best.activeJobs) {
				best = worker;
			}
		}
		if (
			best &&
			(best.activeJobs === 0 || this.workers.size >= this.numberOfWorkers)
		) {
			return best;
		}
		return this._createWorker();
	}

	/**
	 * @returns {WorkerPoolWorker} new worker
	 */
	_createWorker() {
		const backend = this.createBackend(this.workerPath, this.workerData);
		const worker = new WorkerPoolWorker(backend, () => {});
		this.workers.add(worker);
		return worker;
	}

	_scheduleDispose() {
		if (this.activeJobs === 0 && Number.isFinite(this.poolTimeout)) {
			this.timeout = setTimeout(() => this._disposeWorkers(), this.poolTimeout);
			this.timeout.unref();
		}
	}

	_disposeWorkers() {
		if (this.activeJobs === 0) {
			for (const worker of this.workers) {
				worker.dispose();
			}
			this.workers.clear();
		}
	}

	/**
	 * Terminate all workers and reject future jobs.
	 * @returns {Promise<void>}
	 */
	terminate() {
		if (this.terminated) return Promise.resolve();
		this.terminated = true;
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
		const promises = [];
		for (const worker of this.workers) {
			const p = worker.dispose();
			if (p) promises.push(p);
		}
		this.workers.clear();
		return Promise.all(promises).then(() => {});
	}
}

module.exports = WorkerPool;
