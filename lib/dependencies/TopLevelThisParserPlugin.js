/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const ConstDependency = require("./ConstDependency");
const HarmonyExports = require("./HarmonyExports");

/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */

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
			if (HarmonyExports.isEnabled(parser.state)) return;
			const dep = hasGlobalThis
				? new ConstDependency("globalThis", /** @type {Range} */ (node.range))
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
