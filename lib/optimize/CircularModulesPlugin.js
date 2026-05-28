/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { STAGE_DEFAULT } = require("../OptimizationStages");
const CycleGraph = require("./CycleGraph");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "CircularModulesPlugin";

/**
 * Detects circular dependencies and marks each circular module
 * via buildInfo.isCircular for downstream consumers.
 */
class CircularModulesPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.optimizeDependencies.tap(
				{ name: PLUGIN_NAME, stage: STAGE_DEFAULT },
				(modules) => {
					const { circularModules } = CycleGraph.build(
						modules,
						compilation.moduleGraph
					);
					for (const m of circularModules) {
						/** @type {import("../Module").BuildInfo} */
						(m.buildInfo).isCircular = true;
					}
				}
			);
		});
	}
}

module.exports = CircularModulesPlugin;
