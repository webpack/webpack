/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("../../declarations/WebpackOptions.js").RuleSetConditionOrConditions} RuleSetConditionOrConditions */
/** @typedef {import("../../declarations/WebpackOptions.js").RuleSetConditionOrConditionsAbsolute} RuleSetConditionOrConditionsAbsolute */
/** @typedef {import("../../declarations/WebpackOptions.js").RuleSetRule} RuleSetRule */
/** @typedef {import("./RuleSetCompiler.js").default} RuleSetCompiler */

/**
 * Defines the keys of types type used by this module.
 * @template T
 * @template {T[keyof T]} V
 * @typedef {import("./RuleSetCompiler.js").KeysOfTypes<T, V>} KeysOfTypes
 */

/** @typedef {KeysOfTypes<RuleSetRule, RuleSetConditionOrConditions | RuleSetConditionOrConditionsAbsolute>} BasicMatcherRuleKeys */

const PLUGIN_NAME = "BasicMatcherRulePlugin";

class BasicMatcherRulePlugin {
	/**
	 * Creates an instance of BasicMatcherRulePlugin.
	 * @param {BasicMatcherRuleKeys} ruleProperty the rule property
	 * @param {string=} dataProperty the data property
	 * @param {boolean=} invert if true, inverts the condition
	 */
	constructor(ruleProperty, dataProperty, invert) {
		/** @type {BasicMatcherRuleKeys} */
		this.ruleProperty = ruleProperty;
		/** @type {string | BasicMatcherRuleKeys} */
		this.dataProperty = dataProperty || ruleProperty;
		/** @type {boolean} */
		this.invert = invert || false;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			PLUGIN_NAME,
			(path, rule, unhandledProperties, result) => {
				if (unhandledProperties.has(this.ruleProperty)) {
					unhandledProperties.delete(this.ruleProperty);
					const value = rule[this.ruleProperty];
					const condition = ruleSetCompiler.compileCondition(
						`${path}.${this.ruleProperty}`,
						/** @type {RuleSetConditionOrConditions | RuleSetConditionOrConditionsAbsolute} */
						(value)
					);
					const fn = condition.fn;
					result.conditions.push({
						property: this.dataProperty,
						matchWhenEmpty: this.invert
							? !condition.matchWhenEmpty
							: condition.matchWhenEmpty,
						fn: this.invert ? (v) => !fn(v) : fn
					});
				}
			}
		);
	}
}

export default BasicMatcherRulePlugin;

export { BasicMatcherRulePlugin as "module.exports" };
