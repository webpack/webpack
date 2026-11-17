"use strict";

const path = require("path");
const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @typedef {import("../../../../lib/worker/Worker")<{ threadId: () => number }>} ThreadIdWorker */
/** @typedef {import("../../../../lib/worker/WorkerPool")} WorkerPool */

const WORKER = path.resolve(__dirname, "worker.js");

/**
 * A retired thread counts until its `exit` event, so wait for it.
 * @param {WorkerPool} pool the pool
 * @param {number} count threads to reach
 * @returns {Promise<boolean>} whether the pool reached `count` within 2 s
 */
const waitForWorkers = async (pool, count) => {
	for (let i = 0; i < 200; i++) {
		if (pool.stats.workers === count) return true;
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	return false;
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: { threads: { max: 2 } },
	// Node 10 has no worker_threads: the case still runs, inline
	ignoreWarnings: [/worker_threads is unavailable/],
	plugins: [
		{
			apply(compiler) {
				// per compiler: the harness also builds each step with a fresh one
				/** @type {number[]} */
				const threadIds = [];
				let trimmed = true;
				let warmed = true;
				let inline = false;
				compiler.hooks.beforeCompile.tapPromise(
					"compiler-worker-reuse",
					async () => {
						const worker = /** @type {ThreadIdWorker} */ (
							compiler.worker(WORKER)
						);
						const pool = worker._pool;
						inline = pool.options.max === 0;
						if (threadIds.length === 0) {
							await pool.warmup([WORKER], 2);
							warmed = inline || pool.stats.workers === 2;
						} else if (!inline) {
							// the first build warmed two threads but used one
							trimmed = warmed && (await waitForWorkers(pool, 1));
						}
						threadIds.push(await worker.run("threadId"));
						// from here only watch mode can keep a thread between steps
						pool.options.idleTimeout = 1;
					}
				);
				new DefinePlugin({
					SAME_THREAD: DefinePlugin.runtimeValue(
						() =>
							JSON.stringify(
								threadIds.every(
									// threads on: a main-thread id (0) would mean inline
									(id) => id === threadIds[0] && (inline || id > 0)
								)
							),
						true
					),
					TRIMMED: DefinePlugin.runtimeValue(
						() => JSON.stringify(trimmed),
						true
					)
				}).apply(compiler);
			}
		}
	]
};
