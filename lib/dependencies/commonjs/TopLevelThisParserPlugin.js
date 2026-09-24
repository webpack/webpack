/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const ConstDependency = require("../core/ConstDependency");
const ESMExports = require("../esm/ESMExports");

/** @import JavascriptParser, { Range } from "../../javascript/JavascriptParser" */

const GLOBAL_THIS = "globalThis";

const PLUGIN_NAME = "TopLevelThisParserPlugin";

class TopLevelThisParserPlugin {
	/**
	 * Creates an instance of TopLevelThisParserPlugin.
	 * @param {boolean | undefined} hasGlobalThis whether the target has a `globalThis` binding
	 */
	constructor(hasGlobalThis) {
		/** @type {boolean} */
		this.hasGlobalThis = Boolean(hasGlobalThis);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { hasGlobalThis } = this;

		parser.hooks.expression.for("this").tap(PLUGIN_NAME, (node) => {
			if (!parser.scope.topLevelScope) return;
			// an ES module's top-level `this` is `undefined` whatever the option
			// says, and `HarmonyTopLevelThisParserPlugin` answers for it
			if (ESMExports.isEnabled(parser.state)) return;
			// a module may declare `globalThis` itself, and the replacement lands
			// in that scope: a bare identifier would read the declaration, or its
			// temporal dead zone, rather than the global object
			const dep =
				hasGlobalThis && parser.getVariableInfo(GLOBAL_THIS) === GLOBAL_THIS
					? new ConstDependency(GLOBAL_THIS, /** @type {Range} */ (node.range))
					: new ConstDependency(
							RuntimeGlobals.global,
							/** @type {Range} */ (node.range),
							[RuntimeGlobals.global]
						);
			dep.loc = parser.getLocation(node);
			parser.state.module.addPresentationalDependency(dep);
			return true;
		});
	}
}

module.exports = TopLevelThisParserPlugin;
