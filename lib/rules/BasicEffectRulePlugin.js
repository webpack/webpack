/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} RuleSetRule */
/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */

/**
 * @template T
 * @template {T[keyof T]} V
 * @typedef {import("./RuleSetCompiler").KeysOfTypes<T, V>} KeysOfTypes
 */

/** @typedef {KeysOfTypes<RuleSetRule, string | boolean | { [k: string]: EXPECTED_ANY }>} BasicEffectRuleKeys */

class BasicEffectRulePlugin {
	/**
	 * @param {BasicEffectRuleKeys} ruleProperty the rule property
	 * @param {string=} effectType the effect type
	 */
	constructor(ruleProperty, effectType) {
		this.ruleProperty = ruleProperty;
		this.effectType = effectType || ruleProperty;
	}

	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			"BasicEffectRulePlugin",
			(path, rule, unhandledProperties, result, references) => {
				if (unhandledProperties.has(this.ruleProperty)) {
					unhandledProperties.delete(this.ruleProperty);

					const value =
						rule[/** @type {keyof RuleSetRule} */ (this.ruleProperty)];

					result.effects.push({
						type: this.effectType,
						value
					});
				}
			}
		);
	}
}

module.exports = BasicEffectRulePlugin;
