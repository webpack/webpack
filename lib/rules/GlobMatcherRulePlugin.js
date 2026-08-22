/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * @import {
 * 	RuleSetGlob,
 * 	RuleSetGlobs,
 * 	RuleSetRule
 * } from "../../declarations/WebpackOptions"
 */
/** @import RuleSetCompiler from "./RuleSetCompiler" */

/**
 * Defines the keys of types type used by this module.
 * @template T
 * @template {T[keyof T]} V
 * @typedef {import("./RuleSetCompiler").KeysOfTypes<T, V>} KeysOfTypes
 */

/** @typedef {KeysOfTypes<RuleSetRule, RuleSetGlob | RuleSetGlobs>} GlobMatcherRuleKeys */

const PLUGIN_NAME = "GlobMatcherRulePlugin";

class GlobMatcherRulePlugin {
	/**
	 * Creates an instance of GlobMatcherRulePlugin.
	 * @param {GlobMatcherRuleKeys} ruleProperty the rule property
	 * @param {string=} dataProperty the data property
	 */
	constructor(ruleProperty, dataProperty) {
		/** @type {GlobMatcherRuleKeys} */
		this.ruleProperty = ruleProperty;
		/** @type {string | GlobMatcherRuleKeys} */
		this.dataProperty = dataProperty || ruleProperty;
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
					const condition = ruleSetCompiler.compileGlobCondition(
						`${path}.${this.ruleProperty}`,
						/** @type {RuleSetGlob | RuleSetGlobs} */
						(rule[this.ruleProperty])
					);
					result.conditions.push({
						property: this.dataProperty,
						matchWhenEmpty: condition.matchWhenEmpty,
						fn: condition.fn
					});
				}
			}
		);
	}
}

module.exports = GlobMatcherRulePlugin;
