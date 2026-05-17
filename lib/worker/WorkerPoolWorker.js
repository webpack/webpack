/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Based on thread-loader PoolWorker by @sokra
*/

"use strict";

/** @typedef {import("./WorkerBackend")} WorkerBackend */

let nextWorkerId = 0;

class WorkerPoolWorker {
	/**
	 * @param {WorkerBackend} backend the worker backend (thread or process)
	 * @param {() => void} onJobDone called when a job finishes
	 */
	constructor(backend, onJobDone) {
		this.id = nextWorkerId++;
		this.disposed = false;
		/** @type {Map<number, { resolve: (value: EXPECTED_ANY) => void, reject: (reason: Error) => void }>} */
		this.jobs = new Map();
		this.activeJobs = 0;
		this.onJobDone = onJobDone;
		this.nextJobId = 0;
		/** @type {WorkerBackend} */
		this.backend = backend;

		backend.onMessage((message) => this._onMessage(message));
		backend.onError((error) => this._onError(error));
	}

	/**
	 * @param {EXPECTED_ANY} data job data
	 * @returns {Promise<EXPECTED_ANY>} result
	 */
	run(data) {
		const jobId = this.nextJobId++;
		this.activeJobs++;
		return new Promise((resolve, reject) => {
			this.jobs.set(jobId, { resolve, reject });
			this.backend.send({ type: "job", id: jobId, data });
		});
	}

	/**
	 * @param {EXPECTED_ANY} data warmup data
	 */
	warmup(data) {
		this.backend.send({ type: "warmup", data });
	}

	/**
	 * @param {EXPECTED_ANY} msg worker message
	 */
	_onMessage(msg) {
		const { type, id } = msg;
		switch (type) {
			case "result": {
				const job = this.jobs.get(id);
				if (!job) return;
				this.jobs.delete(id);
				this.activeJobs--;
				this.onJobDone();
				job.resolve(msg.data);
				break;
			}
			case "error": {
				const job = this.jobs.get(id);
				if (!job) return;
				this.jobs.delete(id);
				this.activeJobs--;
				this.onJobDone();
				job.reject(new Error(msg.error));
				break;
			}
		}
	}

	/**
	 * @param {Error} err error
	 */
	_onError(err) {
		for (const [, job] of this.jobs) {
			job.reject(err);
		}
		this.jobs.clear();
		this.activeJobs = 0;
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		return this.backend.terminate();
	}
}

module.exports = WorkerPoolWorker;
