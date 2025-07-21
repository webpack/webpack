/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const {
	assignAscendingModuleIds,
	getUsedModuleIdsAndModules
} = require("./IdHelpers");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const PLUGIN_NAME = "NaturalModuleIdsPlugin";

class NaturalModuleIdsPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.moduleIds.tap(PLUGIN_NAME, () => {
				const [usedIds, modulesInNaturalOrder] =
					getUsedModuleIdsAndModules(compilation);
				modulesInNaturalOrder.sort(
					compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
				);
				assignAscendingModuleIds(usedIds, modulesInNaturalOrder, compilation);
			});
		});
	}
}

module.exports = NaturalModuleIdsPlugin;
