/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const { contextify } = require("../util/identifier");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */

class InferAsyncModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("InferAsyncModulesPlugin", compilation => {
			const asyncAwaitUnsupported =
				compilation.runtimeTemplate.supportsAsyncFunction() === false;
			const asyncReasons = [];
			const { moduleGraph } = compilation;
			compilation.hooks.finishModules.tap(
				"InferAsyncModulesPlugin",
				modules => {
					/** @type {Set<Module>} */
					const queue = new Set();
					for (const module of modules) {
						if (module.buildMeta && module.buildMeta.async) {
							queue.add(module);
							if (asyncAwaitUnsupported && "userRequest" in module) {
								asyncReasons.push(
									`- ${contextify(
										compiler.context,
										/** @type {NormalModule} */ (module).userRequest,
										compiler
									)} (${module.buildMeta.asyncReason || "unknown reason"})`
								);
							}
						}
					}
					for (const module of queue) {
						moduleGraph.setAsync(module);
						for (const [
							originModule,
							connections
						] of moduleGraph.getIncomingConnectionsByOriginModule(module)) {
							if (
								connections.some(
									c =>
										c.dependency instanceof HarmonyImportDependency &&
										c.isTargetActive(undefined)
								)
							) {
								queue.add(originModule);
							}
						}
					}

					if (asyncReasons.length) {
						const warning = new WebpackError(
							"Output environment does not support async/await"
						);
						warning.details = `List of async modules:\n${asyncReasons.join(
							"\n"
						)}`;
						compilation.warnings.push(warning);
					}
				}
			);
		});
	}
}

module.exports = InferAsyncModulesPlugin;
