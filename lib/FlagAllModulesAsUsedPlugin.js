/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getEntryRuntime } = require("./util/runtime");

/** @typedef {import("./Compiler")} Compiler */

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
						const runtimes = new Set();
						for (const [name, { options }] of compilation.entries) {
							runtimes.add(getEntryRuntime(compilation, name, options));
						}
						for (const module of modules) {
							const exportsInfo = moduleGraph.getExportsInfo(module);
							for (const runtime of runtimes)
								exportsInfo.setUsedInUnknownWay(runtime);
							moduleGraph.addExtraReason(module, this.explanation);
						}
					}
				);
			}
		);
	}
}

module.exports = FlagAllModulesAsUsedPlugin;
