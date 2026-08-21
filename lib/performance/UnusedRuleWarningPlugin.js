/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UnusedRuleWarning = require("../errors/UnusedRuleWarning");

/**
 * @import {
 * 	RuleSetRule,
 * 	PerformanceOptions
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "UnusedRuleWarningPlugin";

// `NormalModuleFactory` compiles `[{ rules: defaultRules }, { rules: rules }]`,
// so only this subtree belongs to the configuration.
const USER_RULES_PATH = "ruleSet[1].rules";

/**
 * Names the rule the way its author would recognize it. `module.rules[7]` alone
 * is useless when a plugin injected the rule.
 * @param {RuleSetRule} rule the raw rule
 * @returns {string} a short descriptor, or an empty string when nothing identifies it
 */
const describeRule = (rule) => {
	for (const key of ["test", "include", "exclude", "resource", "mimetype"]) {
		const value = rule[/** @type {keyof RuleSetRule} */ (key)];
		if (value instanceof RegExp) return ` (${key}: ${value})`;
		if (typeof value === "string") return ` (${key}: ${value})`;
	}
	if (typeof rule.loader === "string") return ` (loader: ${rule.loader})`;
	if (typeof rule.type === "string") return ` (type: ${rule.type})`;
	return "";
};

class UnusedRuleWarningPlugin {
	/**
	 * Creates an instance of UnusedRuleWarningPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					// Nothing was factorized, so no rule could match — an empty build is
					// not evidence that a rule is unused.
					if (compilation.modules.size === 0) return;

					/** @type {string[]} */
					const descriptions = [];

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
						descriptions.push(
							`${rule.path.replace(USER_RULES_PATH, "module.rules")}${describeRule(
								rule.raw
							)}`
						);
					}

					if (descriptions.length === 0) return;

					const warning = new UnusedRuleWarning(descriptions);

					if (hints === "error") {
						compilation.errors.push(warning);
					} else if (hints === "stats") {
						compilation.hints.push(warning);
					} else {
						compilation.warnings.push(warning);
					}
				});
			}
		);
	}
}

module.exports = UnusedRuleWarningPlugin;
