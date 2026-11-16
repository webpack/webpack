"use strict";

const fs = require("fs");
const path = require("path");
const createWatchMutation = require("../../../helpers/createWatchMutation");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @typedef {{ testPath: string }} TestOptions */

/**
 * Step 1's stale build is followed by one more watch build, which rebuilds
 * `value.js`; the fresh compilation comparing the stale one waits for it, so
 * it always ends while that comparison is pending.
 * @param {unknown} env environment
 * @param {TestOptions} options test paths
 * @returns {import("webpack").Configuration} watch configuration
 */
module.exports = (env, { testPath }) => {
	// each compiler loads this file anew, so the two meet through a file
	const marker = path.join(testPath, "late-build-done");
	let started = false;
	return {
		mode: "development",
		devtool: false,
		cache: { type: "memory" },
		output: { pathinfo: false },
		optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
		plugins: [
			createWatchMutation({
				name: "ignored invalidation",
				detector: "comparison",
				fault: "invalidation"
			}),
			{
				apply(compiler) {
					compiler.hooks.done.tap("LateBuild", () => {
						if (!compiler.watchMode || currentWatchStep.step !== "1") return;
						if (!started) {
							started = true;
							const watching = compiler.watching;
							process.nextTick(() => watching && watching.invalidate());
						} else if (!fs.existsSync(marker)) {
							fs.writeFileSync(marker, "");
						}
					});
					compiler.hooks.run.tapPromise("LateBuild", async () => {
						while (currentWatchStep.step === "1" && !fs.existsSync(marker)) {
							await new Promise((resolve) => {
								setTimeout(resolve, 10);
							});
						}
					});
				}
			}
		]
	};
};
