/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class InferAsyncModulesPlugin {
	/**
	 * @param {Object} options options object
	 * @param {boolean | "await"=} options.errorOnImport false: no error, true: error when importing async module, "await": error when import async module without import await
	 */
	constructor({ errorOnImport = false } = {}) {
		this.errorOnImport = errorOnImport;
	}
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
								if (
									this.errorOnImport &&
									dep instanceof HarmonyImportSideEffectDependency &&
									(this.errorOnImport === true || !dep.await)
								) {
									const error = new WebpackError(
										this.errorOnImport === true
											? "Tried to import async module with import/export (must enable experiments.importAsync to allow this)"
											: "Tried to import async module with normal import/export (must use 'import await'/'export await' instead)"
									);
									error.module = module;
									error.loc = dep.loc;
									compilation.errors.push(error);
								}
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
