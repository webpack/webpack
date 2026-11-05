/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const ConstDependency = require("../core/ConstDependency");
const ESMExports = require("./ESMExports");

/** @import JavascriptParser from "../../javascript/JavascriptParser" */

const PLUGIN_NAME = "ESMTopLevelThisParserPlugin";

class ESMTopLevelThisParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.expression
			.for("this")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (!parser.scope.topLevelScope) return;
				if (ESMExports.isEnabled(parser.state)) {
					const start = path.start(node);
					const end = path.end(node);
					const dep = new ConstDependency("undefined", [start, end], null);
					dep.loc = parser.getLocation({ start, end });
					parser.state.module.addPresentationalDependency(dep);
					return true;
				}
			});
	}
}

module.exports = ESMTopLevelThisParserPlugin;
