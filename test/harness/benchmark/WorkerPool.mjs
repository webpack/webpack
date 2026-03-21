import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_PATH = path.join(__dirname, "worker-bootstrap.mjs");

class PoolWorker {
	/**
	 * @param {string} workerFile absolute path to the worker module
	 * @param {object} forkOptions options forwarded to child_process.fork
	 */
	constructor(workerFile, forkOptions = {}) {
		this._child = fork(BOOTSTRAP_PATH, [workerFile], forkOptions);
		this._idCounter = 0;
		/** @type {Map<number, { resolve: (v: EXPECTED_ANY) => void, reject: (e: Error) => void }>} */
		this._pending = new Map();

		/** @type {(value: void) => void} */
		let resolveReady;
		/** @type {Promise<void>} */
		this._ready = new Promise((resolve) => {
			resolveReady = resolve;
		});

		this._child.on("message", (msg) => {
			if (msg.type === "ready") {
				resolveReady();
				return;
			}

			const { id, result, error, stack } = msg;
			const pending = this._pending.get(id);
			if (!pending) return;
			this._pending.delete(id);

			if (error) {
				const err = new Error(error);
				err.stack = stack;
				pending.reject(err);
			} else {
				pending.resolve(result);
			}
		});

		this._child.on("error", (err) => {
			for (const [, { reject }] of this._pending) {
				reject(err);
			}
			this._pending.clear();
		});

		this._child.on("exit", (code) => {
			if (code !== 0 && this._pending.size > 0) {
				const err = new Error(`Worker exited with code ${code}`);
				for (const [, { reject }] of this._pending) {
					reject(err);
				}
				this._pending.clear();
			}
		});
	}

	/**
	 * @param {string} method method name exported by the worker module
	 * @param {EXPECTED_ANY[]} args arguments passed to the method
	 * @returns {Promise<EXPECTED_ANY>} result from the worker
	 */
	async invoke(method, args) {
		await this._ready;
		const id = this._idCounter++;
		return new Promise((resolve, reject) => {
			this._pending.set(id, { resolve, reject });
			this._child.send({ id, method, args });
		});
	}

	/**
	 * @returns {Promise<void>} resolves when the child process exits
	 */
	terminate() {
		return new Promise((resolve) => {
			if (this._child.exitCode !== null) {
				resolve();
				return;
			}
			this._child.once("exit", () => resolve());
			this._child.kill();
		});
	}
}

export class WorkerPool {
	/**
	 * @param {string} workerFile absolute path to the worker module
	 * @param {object} options pool options
	 * @param {number=} options.numWorkers number of worker processes (default 1)
	 * @param {object=} options.forkOptions options forwarded to child_process.fork
	 */
	constructor(workerFile, options = {}) {
		const numWorkers = options.numWorkers || 1;
		/** @type {PoolWorker[]} */
		this._workers = [];
		/** @type {PoolWorker[]} */
		this._availableWorkers = [];
		/** @type {{ args: EXPECTED_ANY, resolve: (v: EXPECTED_ANY) => void, reject: (e: Error) => void }[]} */
		this._taskQueue = [];

		for (let i = 0; i < numWorkers; i++) {
			const worker = new PoolWorker(workerFile, options.forkOptions);
			this._workers.push(worker);
			this._availableWorkers.push(worker);
		}
	}

	/**
	 * Dispatch a call to the worker's `run` export
	 * @param {EXPECTED_ANY} args argument passed to the worker's run function
	 * @returns {Promise<EXPECTED_ANY>} result from the worker
	 */
	run(args) {
		return new Promise((resolve, reject) => {
			const task = { args, resolve, reject };
			const worker = this._availableWorkers.pop();
			if (worker) {
				this._executeTask(worker, task);
			} else {
				this._taskQueue.push(task);
			}
		});
	}

	/**
	 * @param {PoolWorker} worker worker to execute on
	 * @param {{ args: EXPECTED_ANY, resolve: (v: EXPECTED_ANY) => void, reject: (e: Error) => void }} task queued task
	 */
	async _executeTask(worker, task) {
		try {
			const result = await worker.invoke("run", [task.args]);
			task.resolve(result);
		} catch (err) {
			task.reject(err);
		} finally {
			const nextTask = this._taskQueue.shift();
			if (nextTask) {
				this._executeTask(worker, nextTask);
			} else {
				this._availableWorkers.push(worker);
			}
		}
	}

	/**
	 * Terminate all worker processes
	 * @returns {Promise<void>}
	 */
	async end() {
		await Promise.all(this._workers.map((w) => w.terminate()));
	}
}
