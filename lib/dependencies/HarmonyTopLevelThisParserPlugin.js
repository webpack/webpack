/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const ConstDependency = require("./ConstDependency");

class HarmonyTopLevelThisParserPlugin {
	apply(parser) {
		parser.hooks.expression
			.for("this")
			.tap("HarmonyTopLevelThisParserPlugin", node => {
				if (!parser.scope.topLevelScope) return;
				const isHarmony = parser.state.harmonyModule;
				if (isHarmony) {
					const dep = new ConstDependency("undefined", node.range, null);
					dep.loc = node.loc;
					parser.state.module.addPresentationalDependency(dep);
				}
			});
	}
}

module.exports = HarmonyTopLevelThisParserPlugin;
