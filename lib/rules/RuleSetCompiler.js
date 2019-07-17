/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook } = require("tapable");

/** @typedef {import("../../declarations/WebpackOptions").RuleSetCondition} WebpackOptionsRuleSetCondition */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetConditions} WebpackOptionsRuleSetConditions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetLoaderOptions} WebpackOptionsRuleSetLoaderOptions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} WebpackOptionsRuleSet */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRules} WebpackOptionsRuleSets */

/** @typedef {Array<{apply(RuleSetCompiler): void}>} RuleSetCompilerPlugins */
/** @typedef {keyof WebpackOptionsRuleSet} RuleSetProperty */
/** @typedef {"enforce"|"loader"|"parser"|"resolve"|"sideEffects"|"type"|"use"} RuleSetOptionsProperty */
/** @typedef {Exclude<RuleSetProperty, RuleSetOptionsProperty>} RuleSetConditionProperty */

/**
 * @typedef {Object} RuleCondition
 * @property {RuleSetProperty} property
 * @property {boolean} matchWhenEmpty
 * @property {function(string): boolean} fn
 */

/**
 * @typedef {Object} Condition
 * @property {boolean} matchWhenEmpty
 * @property {function(string): boolean} fn
 */

/**
 * @typedef {Object} CompiledRule
 * @property {RuleCondition[]} conditions
 * @property {(Effect|function(object): Effect[])[]} effects
 * @property {CompiledRule[]=} rules
 * @property {CompiledRule[]=} oneOf
 */

/**
 * @typedef {Object} Effect
 * @property {string} type
 * @property {any} value
 */

/**
 * @typedef {Object} RuleSet
 * @property {Map<string, any>} references map of references in the rule set (may grow over time)
 * @property {function(object): Effect[]} exec execute the rule set
 */

/**
 * Compiles rule set to normalized rule set. Extensible with `rules` hook.
 */
class RuleSetCompiler {
	/**
	 * Create a condition
	 * @param {boolean} matchWhenEmpty match when emty flag
	 * @param {function(string): boolean} fn checks condition
	 * @returns {Condition} condition
	 */
	static createCondition(matchWhenEmpty, fn) {
		return {
			matchWhenEmpty,
			fn
		};
	}
	/**
	 * @param {RuleSetCompilerPlugins} plugins applying plugins
	 */
	constructor(plugins) {
		this.hooks = Object.freeze({
			/** @type {SyncHook<[string, object, Set<string>, CompiledRule, Map<string, any>]>} */
			rule: new SyncHook([
				"path",
				"rule",
				"unhandledProperties",
				"compiledRule",
				"references"
			])
		});
		if (plugins) {
			for (const plugin of plugins) {
				plugin.apply(this);
			}
		}
	}

	/**
	 * @param {WebpackOptionsRuleSets} ruleSet raw user provided rules
	 * @returns {RuleSet} compiled RuleSet
	 */
	compile(ruleSet) {
		const refs = new Map();
		const rules = this.compileRules("ruleSet", ruleSet, refs);

		/**
		 * @param {object} data data passed in
		 * @param {CompiledRule} rule the compiled rule
		 * @param {Effect[]} effects an array where effects are pushed to
		 * @returns {boolean} true, if the rule has matched
		 */
		const execRule = (data, rule, effects) => {
			// Check rule conditions
			for (const condition of rule.conditions) {
				const p = condition.property;
				if (p in data) {
					const value = data[p];
					if (!condition.fn(value)) return false;
				} else if (!condition.matchWhenEmpty) {
					return false;
				}
			}
			// Apply rule and collect rule effects
			for (const effect of rule.effects) {
				if (typeof effect === "function") {
					const returnedEffects = effect(data);
					for (const effect of returnedEffects) {
						effects.push(effect);
					}
				} else {
					effects.push(effect);
				}
			}
			// Check child rules
			if (rule.rules) {
				for (const childRule of rule.rules) {
					execRule(data, childRule, effects);
				}
			}
			if (rule.oneOf) {
				for (const childRule of rule.oneOf) {
					if (execRule(data, childRule, effects)) {
						break;
					}
				}
			}
			return true;
		};

		return {
			references: refs,
			exec: data => {
				/** @type {Effect[]} */
				const effects = [];
				for (const rule of rules) {
					execRule(data, rule, effects);
				}
				return effects;
			}
		};
	}

	/**
	 * @param {string} path current path
	 * @param {WebpackOptionsRuleSets} rules the raw rules provided by user
	 * @param {Map<string, WebpackOptionsRuleSetLoaderOptions>} refs references
	 * @returns {CompiledRule[]} rules
	 */
	compileRules(path, rules, refs) {
		return rules.map((rule, i) =>
			this.compileRule(`${path}[${i}]`, rule, refs)
		);
	}

	/**
	 * @param {string} path current path
	 * @param {WebpackOptionsRuleSet} rule the raw rule provided by user
	 * @param {Map<string, WebpackOptionsRuleSetLoaderOptions>} refs references
	 * @returns {CompiledRule} normalized and compiled rule for processing
	 * @throws {Error} throws error, if unhandled properties exist after compiling
	 */
	compileRule(path, rule, refs) {
		/** @type {Set<RuleSetProperty>} */
		const unhandledProperties = new Set(
			/** @type {Array<RuleSetProperty>} */ (Object.keys(rule).filter(
				key => rule[key] !== undefined
			))
		);

		/** @type {CompiledRule} */
		const compiledRule = {
			conditions: [],
			effects: [],
			rules: undefined,
			oneOf: undefined
		};

		this.hooks.rule.call(path, rule, unhandledProperties, compiledRule, refs);

		if (unhandledProperties.has("rules")) {
			unhandledProperties.delete("rules");
			const rules = rule.rules;
			if (!Array.isArray(rules))
				throw this.error(path, rules, "Rule.rules must be an array of rules");
			compiledRule.rules = this.compileRules(`${path}.rules`, rules, refs);
		}

		if (unhandledProperties.has("oneOf")) {
			unhandledProperties.delete("oneOf");
			const oneOf = rule.oneOf;
			if (!Array.isArray(oneOf))
				throw this.error(path, oneOf, "Rule.oneOf must be an array of rules");
			compiledRule.oneOf = this.compileRules(`${path}.oneOf`, oneOf, refs);
		}

		if (unhandledProperties.size > 0) {
			throw this.error(
				path,
				rule,
				`Properties ${Array.from(unhandledProperties).join(", ")} are unknown`
			);
		}

		return compiledRule;
	}

	/**
	 * @param {string} path current path
	 * @param {WebpackOptionsRuleSetConditions|WebpackOptionsRuleSetCondition} condition user provided condition value
	 * @returns {Condition} compiled condition
	 * @throws {Error} throws error, if condition is falthy
	 * @throws {Error} throws error, if execution of condition function fails
	 * @throws {Error} throws error, if condition is not a function, string literal, RegExp, array or object
	 * @throws {Error} throws error, if not an array provided for `and` condition
	 * @throws {Error} throws error, if unknown key provided in condition definition
	 * @throws {Error} throws error, if zero conditions found
	 */
	compileCondition(path, condition) {
		if (!condition) {
			throw this.error(
				path,
				condition,
				"Expected condition but got falsy value"
			);
		}
		if (typeof condition === "string") {
			return RuleSetCompiler.createCondition(condition.length === 0, str =>
				str.startsWith(condition)
			);
		}
		if (typeof condition === "function") {
			try {
				return RuleSetCompiler.createCondition(condition(""), condition);
			} catch (err) {
				throw this.error(
					path,
					condition,
					"Evaluation of condition function threw error"
				);
			}
		}
		if (condition instanceof RegExp) {
			return RuleSetCompiler.createCondition(condition.test(""), v =>
				condition.test(v)
			);
		}
		// OR condition
		if (Array.isArray(condition)) {
			const items = condition.map((c, i) =>
				this.compileCondition(`${path}[${i}]`, c)
			);
			return this.combineConditionsOr(items);
		}

		if (typeof condition !== "object") {
			throw this.error(
				path,
				condition,
				`Unexcepted ${typeof condition} when condition was expected`
			);
		}

		/** @type {Array<Condition>} */
		const conditions = [];
		for (const key of Object.keys(condition)) {
			/** @type {WebpackOptionsRuleSetCondition|WebpackOptionsRuleSetConditions} */
			const value = condition[key];
			switch (key) {
				case "or":
					if (value) {
						if (!Array.isArray(value)) {
							throw this.error(
								`${path}.or`,
								condition.and,
								"Expected array of conditions"
							);
						}
						conditions.push(this.compileCondition(`${path}.or`, value));
					}
					break;
				case "and":
					if (value) {
						if (!Array.isArray(value)) {
							throw this.error(
								`${path}.and`,
								condition.and,
								"Expected array of conditions"
							);
						}
						/** @type {number} */
						let i = 0;
						for (const item of value) {
							conditions.push(this.compileCondition(`${path}.and[${i}]`, item));
							i++;
						}
					}
					break;
				case "not":
					if (value) {
						const matcher = this.compileCondition(`${path}.not`, value);
						const fn = matcher.fn;
						conditions.push(
							RuleSetCompiler.createCondition(
								!matcher.matchWhenEmpty,
								v => !fn(v)
							)
						);
					}
					break;
				default:
					throw this.error(
						`${path}.${key}`,
						condition[key],
						`Unexcepted property ${key} in condition`
					);
			}
		}
		if (conditions.length === 0) {
			throw this.error(
				path,
				condition,
				"Expected condition, but got empty thing"
			);
		}
		return this.combineConditionsAnd(conditions);
	}

	/**
	 * @param {Condition[]} conditions some conditions
	 * @returns {Condition} merged condition
	 */
	combineConditionsOr(conditions) {
		if (conditions.length === 0) {
			return RuleSetCompiler.createCondition(false, () => false);
		} else if (conditions.length === 1) {
			return conditions[0];
		} else {
			return RuleSetCompiler.createCondition(
				conditions.some(c => c.matchWhenEmpty),
				v => conditions.some(c => c.fn(v))
			);
		}
	}

	/**
	 * @param {Condition[]} conditions some conditions
	 * @returns {Condition} merged condition
	 */
	combineConditionsAnd(conditions) {
		if (conditions.length === 0) {
			return RuleSetCompiler.createCondition(false, () => false);
		} else if (conditions.length === 1) {
			return conditions[0];
		} else {
			return RuleSetCompiler.createCondition(
				conditions.every(c => c.matchWhenEmpty),
				v => conditions.every(c => c.fn(v))
			);
		}
	}

	/**
	 * @param {string} path current path
	 * @param {any} value value at the error location
	 * @param {string} message message explaining the problem
	 * @returns {Error} an error object
	 */
	error(path, value, message) {
		return new Error(
			`Compiling RuleSet failed: ${message} (at ${path}: ${value})`
		);
	}

	/**
	 * @param {string} type type
	 * @param {any} value value
	 * @returns {Effect} effect
	 */
	createEffect(type, value) {
		return {
			type,
			value
		};
	}

	/**
	 * Create compiled rule condition
	 * @param {boolean} matchWhenEmpty match when empty
	 * @param {function(string): boolean} fn check condition
	 * @param {RuleSetProperty} property rule set property
	 * @returns {RuleCondition} rule condition
	 */
	createRuleCondition(matchWhenEmpty, fn, property) {
		return {
			matchWhenEmpty,
			fn,
			property
		};
	}
}

module.exports = RuleSetCompiler;
