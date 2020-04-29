/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

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
						for (const module of modules) {
							moduleGraph.getExportsInfo(module).setUsedInUnknownWay();
							moduleGraph.addExtraReason(module, this.explanation);
						}
					}
				);
			}
		);
	}
}

module.exports = FlagAllModulesAsUsedPlugin;
