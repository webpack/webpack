/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} WebpackOptionsRuleSet */
/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").CompiledRule} CompiledRule */
/** @typedef {import("./RuleSetCompiler").RuleSetOptionsProperty} RuleSetOptionsProperty */
/** @typedef {import("./RuleSetCompiler").RuleSetProperty} RuleSetProperty */

/**
 * Extracting effect from {@param ruleProperty} in WebpackOptions.RuleSetRule
 */
class BasicEffectRulePlugin {
	/**
	 * @param {RuleSetOptionsProperty} ruleProperty rule set property
	 * @param {string=} effectType effect type
	 */
	constructor(ruleProperty, effectType) {
		/** @type {RuleSetOptionsProperty} */
		this.ruleProperty = ruleProperty;
		/** @type {string} */
		this.effectType = effectType || ruleProperty;
	}

	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			"BasicEffectRulePlugin",
			/**
			 * @param {string} path path
			 * @param {WebpackOptionsRuleSet} rule rule set
			 * @param {Set<RuleSetProperty>} unhandledProperties unhandled properties
			 * @param {CompiledRule} result compilation result
			 * @returns {void}
			 */
			(path, rule, unhandledProperties, result) => {
				if (unhandledProperties.has(this.ruleProperty)) {
					unhandledProperties.delete(this.ruleProperty);

					const value = rule[this.ruleProperty];

					result.effects.push(
						ruleSetCompiler.createEffect(this.effectType, value)
					);
				}
			}
		);
	}
}

module.exports = BasicEffectRulePlugin;
