/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */

class BasicEffectRulePlugin {
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

					const value = rule[this.ruleProperty];

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
