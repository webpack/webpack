/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

import ConstDependency from "./ConstDependency.js";
import * as HarmonyExports from "./HarmonyExports.js";
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser.js").default} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

const PLUGIN_NAME = "HarmonyTopLevelThisParserPlugin";

class HarmonyTopLevelThisParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.expression.for("this").tap(PLUGIN_NAME, (node) => {
			if (!parser.scope.topLevelScope) return;
			if (HarmonyExports.isEnabled(parser.state)) {
				const dep = new ConstDependency(
					"undefined",
					/** @type {Range} */ (node.range),
					null
				);
				dep.loc = /** @type {DependencyLocation} */ (node.loc);
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		});
	}
}

export default HarmonyTopLevelThisParserPlugin;

export { HarmonyTopLevelThisParserPlugin as "module.exports" };
