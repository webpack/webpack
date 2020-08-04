/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class InferAsyncModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("InferAsyncModulesPlugin", compilation => {
			const { moduleGraph } = compilation;
			compilation.hooks.finishModules.tap(
				"InferAsyncModulesPlugin",
				modules => {
					/** @type {Set<Module>} */
					const queue = new Set();
					for (const module of modules) {
						if (module.buildMeta && module.buildMeta.async) {
							queue.add(module);
						}
					}
					for (const module of queue) {
						moduleGraph.setAsync(module);
						const connections = moduleGraph.getIncomingConnections(module);
						for (const connection of connections) {
							const dep = connection.dependency;
							if (
								dep instanceof HarmonyImportDependency &&
								connection.isActive(undefined)
							) {
								queue.add(connection.originModule);
							}
						}
					}
				}
			);
		});
	}
}

module.exports = InferAsyncModulesPlugin;
