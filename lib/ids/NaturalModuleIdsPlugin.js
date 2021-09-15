/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const { assignAscendingModuleIds } = require("./IdHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NaturalModuleIdsPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalModuleIdsPlugin", compilation => {
			compilation.hooks.moduleIds.tap("NaturalModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const modulesInNaturalOrder = Array.from(modules)
					.filter(
						m =>
							m.needId &&
							chunkGraph.getNumberOfModuleChunks(m) > 0 &&
							chunkGraph.getModuleId(m) === null
					)
					.sort(
						compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
					);
				assignAscendingModuleIds(modulesInNaturalOrder, compilation);
			});
		});
	}
}

module.exports = NaturalModuleIdsPlugin;
