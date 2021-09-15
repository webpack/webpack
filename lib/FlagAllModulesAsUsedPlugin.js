/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getEntryRuntime, mergeRuntimeOwned } = require("./util/runtime");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

class FlagAllModulesAsUsedPlugin {
	constructor(explanation) {
		this.explanation = explanation;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagAllModulesAsUsedPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.optimizeDependencies.tap(
					"FlagAllModulesAsUsedPlugin",
					modules => {
						/** @type {RuntimeSpec} */
						let runtime = undefined;
						for (const [name, { options }] of compilation.entries) {
							runtime = mergeRuntimeOwned(
								runtime,
								getEntryRuntime(compilation, name, options)
							);
						}
						for (const module of modules) {
							const exportsInfo = moduleGraph.getExportsInfo(module);
							exportsInfo.setUsedInUnknownWay(runtime);
							moduleGraph.addExtraReason(module, this.explanation);
							if (module.factoryMeta === undefined) {
								module.factoryMeta = {};
							}
							module.factoryMeta.sideEffectFree = false;
						}
					}
				);
			}
		);
	}
}

module.exports = FlagAllModulesAsUsedPlugin;
