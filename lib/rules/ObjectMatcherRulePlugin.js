/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").RuleCondition} RuleCondition */

class ObjectMatcherRulePlugin {
	/**
	 * @param {string} ruleProperty the rule property
	 * @param {string=} dataProperty the data property
	 */
	constructor(ruleProperty, dataProperty) {
		this.ruleProperty = ruleProperty;
		this.dataProperty = dataProperty || ruleProperty;
	}

	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		const { ruleProperty, dataProperty } = this;
		ruleSetCompiler.hooks.rule.tap(
			"ObjectMatcherRulePlugin",
			(path, rule, unhandledProperties, result) => {
				if (unhandledProperties.has(ruleProperty)) {
					unhandledProperties.delete(ruleProperty);
					const value = rule[ruleProperty];
					for (const property of Object.keys(value)) {
						const nestedDataProperties = property.split(".");
						const condition = ruleSetCompiler.compileCondition(
							`${path}.${ruleProperty}.${property}`,
							value[property]
						);
						result.conditions.push({
							property: [dataProperty, ...nestedDataProperties],
							matchWhenEmpty: condition.matchWhenEmpty,
							fn: condition.fn
						});
					}
				}
			}
		);
	}
}

module.exports = ObjectMatcherRulePlugin;
