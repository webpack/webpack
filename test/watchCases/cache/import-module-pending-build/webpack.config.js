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
				/** @type {import("webpack").ModuleGraph | undefined} */
				let previousGraph;
				compiler.hooks.thisCompilation.tap(
					"PendingImportModule",
					(compilation) => {
						const reused = previousGraph === compilation.moduleGraph;
						previousGraph = compilation.moduleGraph;
						if (
							!compiler.watchMode ||
							currentWatchStep.step === "0" ||
							completedCompilers.has(compiler)
						) {
							return;
						}
						expect(reused).toBe(true);
						let consumerFinished = false;
						/** @type {(() => void) | undefined} */
						let releaseShared;
						/** @type {() => void} */
						let notifyShared;
						/** @type {Promise<void>} */
						const sharedStarted = new Promise((resolve) => {
							notifyShared = resolve;
						});
						const normalModuleHooks =
							compiler.webpack.NormalModule.getCompilationHooks(compilation);
						normalModuleHooks.loader.tap("PendingImportModule", (context) => {
							/** @type {BarrierLoaderContext} */ (context).waitForShared =
								() => sharedStarted;
						});
						/**
						 * @param {import("webpack").Module} module completed or retained module
						 * @returns {void}
						 */
						const releaseForConsumer = (module) => {
							if (
								module.nameForCondition() !==
								path.join(compiler.context, "consumer.generated")
							) {
								return;
							}
							consumerFinished = true;
							if (releaseShared) {
								setImmediate(releaseShared);
								releaseShared = undefined;
							}
						};
						// Retained modules can validate their snapshots without entering buildQueue.
						normalModuleHooks.needBuild.tapAsync(
							"PendingImportModule",
							(module, context, callback) => {
								releaseForConsumer(module);
								callback();
							}
						);
						compilation.buildQueue.hooks.result.tap(
							"PendingImportModule",
							releaseForConsumer
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
