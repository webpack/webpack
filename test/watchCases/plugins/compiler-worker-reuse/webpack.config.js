"use strict";

const path = require("path");
const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: { threads: { max: 1 } },
	plugins: [
		{
			apply(compiler) {
				// per compiler: the harness also builds each step with a fresh one
				/** @type {number[]} */
				const threadIds = [];
				compiler.hooks.beforeCompile.tapPromise(
					"compiler-worker-reuse",
					async () => {
						const worker =
							/** @type {import("../../../../lib/worker/Worker")<{ threadId: () => number }>} */ (
								compiler.worker(path.resolve(__dirname, "worker.js"))
							);
						threadIds.push(await worker.run("threadId"));
					}
				);
				new DefinePlugin({
					SAME_THREAD: DefinePlugin.runtimeValue(
						() => JSON.stringify(threadIds.every((id) => id === threadIds[0])),
						true
					)
				}).apply(compiler);
			}
		}
	]
};
