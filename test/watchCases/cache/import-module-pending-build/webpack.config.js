"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { BarrierLoaderContext } from "./loader" */

/** @type {WeakSet<import("webpack").Compiler>} */
const completedCompilers = new WeakSet();

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: false,
		rules: [{ test: /\.generated$/, use: require.resolve("./loader") }]
	},
	plugins: [
		{
			completedCompilers,
			/**
			 * @param {import("webpack").Compiler} compiler watched compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(
					"PendingImportModule",
					(compilation) => {
						if (
							!compiler.watchMode ||
							currentWatchStep.step === "0" ||
							completedCompilers.has(compiler)
						) {
							return;
						}
						let consumerFinished = false;
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
							/** @type {BarrierLoaderContext} */ (context).waitForShared =
								() => sharedStarted;
						});
						compilation.buildQueue.hooks.result.tap(
							"PendingImportModule",
							(module) => {
								if (
									module.nameForCondition() !==
									path.join(compiler.context, "consumer.generated")
								) {
									return;
								}
								// A partial watch notification can reuse the consumer from cache.
								consumerFinished = true;
								if (releaseShared) {
									setImmediate(releaseShared);
									releaseShared = undefined;
								}
							}
						);
						compilation.buildQueue.hooks.beforeStart.tapAsync(
							"PendingImportModule",
							(module, callback) => {
								if (
									module.nameForCondition() ===
										path.join(compiler.context, "shared.js") &&
									!consumerFinished
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
								completedCompilers.add(compiler);
								setImmediate(releaseShared);
								releaseShared = undefined;
							}
						};
					}
				);
			}
		}
	]
};
