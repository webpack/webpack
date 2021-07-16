/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").RuleCondition} RuleCondition */

const RULE_PROPERTY = "descriptionData";

class DescriptionDataMatcherRulePlugin {
	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			"DescriptionDataMatcherRulePlugin",
			(path, rule, unhandledProperties, result) => {
				if (unhandledProperties.has(RULE_PROPERTY)) {
					unhandledProperties.delete(RULE_PROPERTY);
					const value = rule[RULE_PROPERTY];
					for (const property of Object.keys(value)) {
						const dataProperty = property.split(".");
						const condition = ruleSetCompiler.compileCondition(
							`${path}.${RULE_PROPERTY}.${property}`,
							value[property]
						);
						result.conditions.push({
							property: ["descriptionData", ...dataProperty],
							matchWhenEmpty: condition.matchWhenEmpty,
							fn: condition.fn
						});
					}
				}
			}
		);
	}
}

module.exports = DescriptionDataMatcherRulePlugin;
