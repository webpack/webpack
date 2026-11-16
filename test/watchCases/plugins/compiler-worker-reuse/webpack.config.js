"use strict";

const path = require("path");
const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @typedef {import("../../../../lib/worker/Worker")<{ threadId: () => number }>} ThreadIdWorker */

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
				let inline = false;
				compiler.hooks.beforeCompile.tapPromise(
					"compiler-worker-reuse",
					async () => {
						const worker = /** @type {ThreadIdWorker} */ (
							compiler.worker(path.resolve(__dirname, "worker.js"))
						);
						const pool = worker._pool;
						inline = pool.options.max === 0;
						// only watch mode can keep a thread between steps now
						pool.options.idleTimeout = 1;
						if (threadIds.length > 0 && pool.options.max > 0) {
							// the first build warmed two threads but used one
							trimmed = pool.stats.workers === 1;
						} else {
							await worker.warmup(2);
						}
						threadIds.push(await worker.run("threadId"));
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
