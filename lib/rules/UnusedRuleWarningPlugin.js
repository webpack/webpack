/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UnusedRuleWarning = require("./UnusedRuleWarning");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "UnusedRuleWarningPlugin";

// `NormalModuleFactory` compiles `[{ rules: defaultRules }, { rules: rules }]`,
// so only this subtree belongs to the user.
const USER_RULES_PATH = "ruleSet[1].rules";

class UnusedRuleWarningPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					// Nothing was factorized, so no rule could match — that is an empty
					// build, not an unused rule.
					if (compilation.modules.size === 0) return;
					const paths = [];
					for (const rule of normalModuleFactory.ruleSet.unusedRules()) {
						if (!rule.path.startsWith(USER_RULES_PATH)) continue;
						// A rule aimed at another compiler of a MultiCompiler is inactive
						// here by design, not by mistake.
						if (
							rule.conditions.some(
								(condition) => condition.property === "compiler"
							)
						) {
							continue;
						}
						paths.push(rule.path.replace(USER_RULES_PATH, "module.rules"));
					}
					if (paths.length > 0) {
						compilation.warnings.push(new UnusedRuleWarning(paths));
					}
				});
			}
		);
	}
}

module.exports = UnusedRuleWarningPlugin;
