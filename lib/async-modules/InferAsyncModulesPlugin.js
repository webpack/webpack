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
	constructor(options) {
		const { errorOnMissingAwait = false } = options || {};
		this.errorOnMissingAwait = errorOnMissingAwait;
	}
	/**
	 * @param {Compiler} compiler webpack compiler
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
							if (dep instanceof HarmonyImportDependency && connection.active) {
								if (
									this.errorOnMissingAwait &&
									dep instanceof HarmonyImportSideEffectDependency &&
									!dep.await
								) {
									const error = new WebpackError(
										"Tried to import async module with normal import/export (must use 'import await'/'export await' instead)"
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
