/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").RuleSetCondition} WebpackOptionsRuleSetCondition */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetConditions} WebpackOptionsRuleSetConditions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} WebpackOptionsRuleSet */
/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").CompiledRule} CompiledRule */
/** @typedef {import("./RuleSetCompiler").RuleSetConditionProperty} RuleSetConditionProperty */
/** @typedef {import("./RuleSetCompiler").RuleSetProperty} RuleSetProperty */

/**
 * Creates rule conditions for compiled rule
 */
class BasicMatcherRulePlugin {
	/**
	 * @param {RuleSetConditionProperty} ruleProperty rule property
	 * @param {RuleSetProperty=} dataProperty data property
	 * @param {boolean=} invert invert
	 */
	constructor(ruleProperty, dataProperty, invert) {
		this.ruleProperty = ruleProperty;
		this.dataProperty = dataProperty || ruleProperty;
		this.invert = invert || false;
	}

	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			"BasicMatcherRulePlugin",
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
					/** @type {WebpackOptionsRuleSetConditions|WebpackOptionsRuleSetCondition} */
					const value = rule[this.ruleProperty];
					const condition = ruleSetCompiler.compileCondition(
						`${path}.${this.ruleProperty}`,
						value
					);
					let fn = condition.fn;

					if (this.invert) {
						/**
						 * @param {string} v value
						 * @returns {boolean} condition check result
						 */
						fn = v => !condition.fn(v);
					}

					result.conditions.push(
						ruleSetCompiler.createRuleCondition(
							this.invert
								? !condition.matchWhenEmpty
								: condition.matchWhenEmpty,
							fn,
							this.dataProperty
						)
					);
				}
			}
		);
	}
}

module.exports = BasicMatcherRulePlugin;
