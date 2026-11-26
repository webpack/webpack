"use strict";

/** @import { Configuration } from "../../../../" */

const lateParent = require.resolve("./node_modules/lib/es/late-parent");
const lateLeaf = require.resolve("./node_modules/lib/es/late-leaf");

/** @type {Configuration[]} */
module.exports = [
	{ mode: "development" },
	{ mode: "development", optimization: { sideEffects: true } },
	{ mode: "development", optimization: { usedExports: true } },
	{ mode: "production", optimization: { usedExports: false } },
	{ mode: "production" }
].map((config) => ({
	...config,
	devtool: false,
	optimization: {
		...config.optimization,
		concatenateModules: false,
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("LateStarRequest", (compilation) => {
				let leafProcessed = false;
				/** @type {(() => void) | undefined} */
				let resumeParent;
				// Classify the directly requested leaf before the parent forwards its star export.
				compilation.processDependenciesQueue.hooks.beforeStart.tapAsync(
					"LateStarRequest",
					(module, callback) => {
						if (module.nameForCondition() === lateParent && !leafProcessed) {
							resumeParent = callback;
						} else {
							callback();
						}
					}
				);
				compilation.processDependenciesQueue.hooks.result.tap(
					"LateStarRequest",
					(module) => {
						if (module.nameForCondition() !== lateLeaf) return;
						leafProcessed = true;
						if (resumeParent !== undefined) resumeParent();
					}
				);
			});
		}
	]
}));
