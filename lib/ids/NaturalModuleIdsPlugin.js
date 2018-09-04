/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const { compareModulesByIndexOrIdentifier } = require("../util/comparators");
const assignAscendingIds = require("./assignAscendingIds");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NaturalModuleIdsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalModuleIdsPlugin", compilation => {
			compilation.hooks.moduleIds.tap("NaturalModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const modulesInNaturalOrder = Array.from(modules)
					.filter(m => chunkGraph.getNumberOfModuleChunks(m) > 0)
					.sort(compareModulesByIndexOrIdentifier(compilation.moduleGraph));
				assignAscendingIds(modulesInNaturalOrder, compilation);
			});
		});
	}
}

module.exports = NaturalModuleIdsPlugin;
