/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").RuleSetConditionOrConditions} RuleSetConditionOrConditions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} RuleSetRule */
/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").EffectData} EffectData */
/** @typedef {import("./RuleSetCompiler").RuleCondition} RuleCondition */
/** @typedef {import("./RuleSetCompiler").RuleConditionFunction} RuleConditionFunction */

/**
 * @template T
 * @template {T[keyof T]} V
 * @typedef {import("./RuleSetCompiler").KeysOfTypes<T, V>} KeysOfTypes
 */

/** @typedef {KeysOfTypes<RuleSetRule, { [k: string]: RuleSetConditionOrConditions }>} ObjectMatcherRuleKeys */

const PLUGIN_NAME = "ObjectMatcherRulePlugin";

class ObjectMatcherRulePlugin {
	/**
	 * @param {ObjectMatcherRuleKeys} ruleProperty the rule property
	 * @param {keyof EffectData=} dataProperty the data property
	 * @param {RuleConditionFunction=} additionalConditionFunction need to check
	 */
	constructor(ruleProperty, dataProperty, additionalConditionFunction) {
		this.ruleProperty = ruleProperty;
		this.dataProperty = dataProperty || ruleProperty;
		this.additionalConditionFunction = additionalConditionFunction;
	}

	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		const { ruleProperty, dataProperty } = this;
		ruleSetCompiler.hooks.rule.tap(
			PLUGIN_NAME,
			(path, rule, unhandledProperties, result) => {
				if (unhandledProperties.has(ruleProperty)) {
					unhandledProperties.delete(ruleProperty);
					const value =
						/** @type {Record<string, RuleSetConditionOrConditions>} */
						(rule[ruleProperty]);
					for (const property of Object.keys(value)) {
						const nestedDataProperties = property.split(".");
						const condition = ruleSetCompiler.compileCondition(
							`${path}.${ruleProperty}.${property}`,
							value[property]
						);
						if (this.additionalConditionFunction) {
							result.conditions.push({
								property: [dataProperty],
								matchWhenEmpty: condition.matchWhenEmpty,
								fn: this.additionalConditionFunction
							});
						}
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
