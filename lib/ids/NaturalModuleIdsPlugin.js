/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const assignAscendingModuleIds = require("./assignAscendingModuleIds");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NaturalModuleIdsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalModuleIdsPlugin", compilation => {
			/** @type {function(Module): void} */
			let assignIdToModule;

			compilation.hooks.moduleIds.tap("NaturalModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const modulesInNaturalOrder = Array.from(modules)
					.filter(m => chunkGraph.getNumberOfModuleChunks(m) > 0)
					.sort(
						compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
					);
				assignIdToModule = assignAscendingModuleIds(
					modulesInNaturalOrder,
					compilation
				);
			});
			compilation.hooks.runtimeModule.tap("NaturalModuleIdsPlugin", module => {
				assignIdToModule(module);
			});
		});
	}
}

module.exports = NaturalModuleIdsPlugin;
