"use strict";

const path = require("path");

/** @import { ModuleGraph } from "webpack" */
/** @import { BarrierLoaderContext } from "./loader" */

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: false,
		rules: [{ test: /\.generated$/, use: require.resolve("./loader") }]
	},
	plugins: [
		(compiler) => {
			/** @type {ModuleGraph | undefined} */
			let previousGraph;
			compiler.hooks.thisCompilation.tap(
				"PendingImportModule",
				(compilation) => {
					const reused = previousGraph === compilation.moduleGraph;
					previousGraph = compilation.moduleGraph;
					if (!reused) return;
					/** @type {(() => void) | undefined} */
					let releaseShared;
					/** @type {() => void} */
					let notifyShared;
					/** @type {Promise<void>} */
					const sharedStarted = new Promise((resolve) => {
						notifyShared = resolve;
					});
					compiler.webpack.NormalModule.getCompilationHooks(
						compilation
					).loader.tap("PendingImportModule", (context) => {
						/** @type {BarrierLoaderContext} */ (context).waitForShared = () =>
							sharedStarted;
					});
					compilation.buildQueue.hooks.beforeStart.tapAsync(
						"PendingImportModule",
						(module, callback) => {
							if (
								module.nameForCondition() ===
								path.join(compiler.context, "shared.js")
							) {
								releaseShared = callback;
								notifyShared();
							} else {
								callback();
							}
						}
					);
					const executeModule = compilation.executeModule;
					compilation.executeModule = (module, options, callback) => {
						executeModule.call(compilation, module, options, callback);
						// Start aggregation before shared starts building.
						if (releaseShared) {
							setImmediate(releaseShared);
							releaseShared = undefined;
						}
					};
				}
			);
		}
	]
};
