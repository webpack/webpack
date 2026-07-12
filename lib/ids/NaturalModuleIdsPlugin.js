/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

import { compareModulesByPreOrderIndexOrIdentifier } from "../util/comparators.js";
import {
	assignAscendingModuleIds,
	getUsedModuleIdsAndModules
} from "./IdHelpers.js";
/** @typedef {import("../Compiler.js").default} Compiler */

const PLUGIN_NAME = "NaturalModuleIdsPlugin";

class NaturalModuleIdsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
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

export default NaturalModuleIdsPlugin;

export { NaturalModuleIdsPlugin as "module.exports" };
