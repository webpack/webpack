/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const ConstDependency = require("./ConstDependency");
const ESMExports = require("./ESMExports");

/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */

const PLUGIN_NAME = "HarmonyTopLevelThisParserPlugin";

// TODO in the next major release: rename to `ESMTopLevelThisParserPlugin`
class HarmonyTopLevelThisParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.expression.for("this").tap(PLUGIN_NAME, (node) => {
			if (!parser.scope.topLevelScope) return;
			if (ESMExports.isEnabled(parser.state)) {
				const dep = new ConstDependency(
					"undefined",
					/** @type {Range} */ (node.range),
					null
				);
				dep.loc = parser.getLocation(node);
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		});
	}
}

module.exports = HarmonyTopLevelThisParserPlugin;
