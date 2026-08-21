/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook } = require("tapable");
const { createPathGlobMatcher } = require("../util/globUtils");

/** @import { ResolveRequest } from "enhanced-resolve" */
/**
 * @import {
 * 	Falsy,
 * 	RuleSetUseItem,
 * 	RuleSetLoaderOptions,
 * 	RuleSetRule,
 * 	RuleSetConditionAbsolute
 * } from "../../declarations/WebpackOptions"
 */

/** @typedef {(Falsy | RuleSetRule)[]} RuleSetRules */

/**
 * Defines the rule condition function type used by this module.
 * @typedef {(value: EffectData[keyof EffectData]) => boolean} RuleConditionFunction
 */

/**
 * Defines the rule condition type used by this module.
 * @typedef {object} RuleCondition
 * @property {string | string[]} property
 * @property {boolean} matchWhenEmpty
 * @property {RuleConditionFunction} fn
 */

/**
 * Defines the condition type used by this module.
 * @typedef {object} Condition
 * @property {boolean} matchWhenEmpty
 * @property {RuleConditionFunction} fn
 */

/**
 * Defines the effect data type used by this module.
 * @typedef {object} EffectData
 * @property {string=} resource
 * @property {string=} realResource
 * @property {string=} resourceQuery
 * @property {string=} resourceFragment
 * @property {string=} scheme
 * @property {ImportAttributes=} attributes
 * @property {string=} mimetype
 * @property {string} dependency
 * @property {ResolveRequest["descriptionFileData"]=} descriptionData
 * @property {ResolveRequest["relativePath"]=} descriptionRelativePath
 * @property {string=} compiler
 * @property {string} issuer
 * @property {string} issuerLayer
 * @property {string=} phase
 */

/**
 * Defines the compiled rule type used by this module.
 * @typedef {object} CompiledRule
 * @property {string} path
 * @property {RuleSetRule} raw
 * @property {boolean} used
 * @property {RuleCondition[]} conditions
 * @property {(Effect | ((effectData: EffectData) => Effect[]))[]} effects
 * @property {CompiledRule[]=} rules
 * @property {CompiledRule[]=} oneOf
 */

/** @typedef {"use" | "use-pre" | "use-post"} EffectUseType */

/**
 * Defines the effect use type used by this module.
 * @typedef {object} EffectUse
 * @property {EffectUseType} type
 * @property {{ loader: string, options?: string | null | Record<string, EXPECTED_ANY>, ident?: string }} value
 */

/**
 * Defines the effect basic type used by this module.
 * @typedef {object} EffectBasic
 * @property {string} type
 * @property {EXPECTED_ANY} value
 */

/** @typedef {EffectUse | EffectBasic} Effect */

/** @typedef {Map<string, RuleSetLoaderOptions>} References */

/**
 * Defines the rule set type used by this module.
 * @typedef {object} RuleSet
 * @property {References} references map of references in the rule set (may grow over time)
 * @property {(effectData: EffectData) => Effect[]} exec execute the rule set
 * @property {() => CompiledRule[]} unusedRules the rules that never matched, outermost first
 */

/**
 * Defines the keys of types type used by this module.
 * @template T
 * @template {T[keyof T]} V
 * @typedef {({ [key in keyof Required<T>]: Required<T>[key] extends V ? key : never })[keyof T]} KeysOfTypes
 */

/** @typedef {Set<string>} UnhandledProperties */

/** @typedef {(str: string) => boolean} GlobMatcher */
/** @typedef {(data: EffectData) => (RuleSetUseItem | (Falsy | RuleSetUseItem)[])} RuleSetUseFn */
/** @typedef {(value: string) => boolean} RuleSetConditionFn */

/** @typedef {{ apply: (ruleSetCompiler: RuleSetCompiler) => void }} RuleSetPlugin */

/**
 * @param {GlobMatcher[]} positive patterns that select
 * @param {GlobMatcher[]} negative patterns that subtract
 * @returns {GlobMatcher} matcher
 */
const combineGlobMatchers = (positive, negative) => {
	/** @type {GlobMatcher} */
	const matchPositive =
		positive.length === 0
			? () => true
			: positive.length === 1
				? positive[0]
				: (str) => positive.some((match) => match(str));
	if (negative.length === 0) return matchPositive;
	/** @type {GlobMatcher} */
	const matchNegative =
		negative.length === 1
			? negative[0]
			: (str) => negative.some((match) => match(str));
	return (str) => matchPositive(str) && !matchNegative(str);
};

class RuleSetCompiler {
	/**
	 * Creates an instance of RuleSetCompiler.
	 * @param {RuleSetPlugin[]} plugins plugins
	 */
	constructor(plugins) {
		this.hooks = Object.freeze({
			/** @type {SyncHook<[string, RuleSetRule, UnhandledProperties, CompiledRule, References]>} */
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
	 * Returns compiled RuleSet.
	 * @param {RuleSetRules} ruleSet raw user provided rules
	 * @returns {RuleSet} compiled RuleSet
	 */
	compile(ruleSet) {
		/** @type {References} */
		const refs = new Map();
		const rules = this.compileRules("ruleSet", ruleSet, refs);

		/**
		 * Returns true, if the rule has matched.
		 * @param {EffectData} data data passed in
		 * @param {CompiledRule} rule the compiled rule
		 * @param {Effect[]} effects an array where effects are pushed to
		 * @returns {boolean} true, if the rule has matched
		 */
		const execRule = (data, rule, effects) => {
			for (const condition of rule.conditions) {
				const p = condition.property;
				if (Array.isArray(p)) {
					/** @type {EXPECTED_ANY} */
					let current = data;
					for (const subProperty of p) {
						if (
							current &&
							typeof current === "object" &&
							Object.prototype.hasOwnProperty.call(current, subProperty)
						) {
							current = current[/** @type {keyof EffectData} */ (subProperty)];
						} else {
							current = undefined;
							break;
						}
					}
					if (current !== undefined) {
						if (!condition.fn(current)) return false;
						continue;
					}
				} else if (p in data) {
					const value = data[/** @type {keyof EffectData} */ (p)];
					if (value !== undefined) {
						if (!condition.fn(value)) return false;
						continue;
					}
				}
				if (!condition.matchWhenEmpty) {
					return false;
				}
			}
			rule.used = true;
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
			exec: (data) => {
				/** @type {Effect[]} */
				const effects = [];
				for (const rule of rules) {
					execRule(data, rule, effects);
				}
				return effects;
			},
			unusedRules: () => {
				/** @type {CompiledRule[]} */
				const unused = [];
				collectUnusedRules(rules, unused);
				return unused;
			}
		};
	}

	/**
	 * Returns rules.
	 * @param {string} path current path
	 * @param {RuleSetRules} rules the raw rules provided by user
	 * @param {References} refs references
	 * @returns {CompiledRule[]} rules
	 */
	compileRules(path, rules, refs) {
		return rules
			.filter(Boolean)
			.map((rule, i) =>
				this.compileRule(
					`${path}[${i}]`,
					/** @type {RuleSetRule} */ (rule),
					refs
				)
			);
	}

	/**
	 * Returns normalized and compiled rule for processing.
	 * @param {string} path current path
	 * @param {RuleSetRule} rule the raw rule provided by user
	 * @param {References} refs references
	 * @returns {CompiledRule} normalized and compiled rule for processing
	 */
	compileRule(path, rule, refs) {
		/** @type {UnhandledProperties} */
		const unhandledProperties = new Set(
			Object.keys(rule).filter(
				(key) => rule[/** @type {keyof RuleSetRule} */ (key)] !== undefined
			)
		);

		/** @type {CompiledRule} */
		const compiledRule = {
			path,
			raw: rule,
			used: false,
			conditions: [],
			effects: [],
			rules: undefined,
			oneOf: undefined
		};

		this.hooks.rule.call(path, rule, unhandledProperties, compiledRule, refs);

		if (unhandledProperties.has("rules")) {
			unhandledProperties.delete("rules");
			const rules = rule.rules;
			if (!Array.isArray(rules)) {
				throw this.error(path, rules, "Rule.rules must be an array of rules");
			}
			compiledRule.rules = this.compileRules(`${path}.rules`, rules, refs);
		}

		if (unhandledProperties.has("oneOf")) {
			unhandledProperties.delete("oneOf");
			const oneOf = rule.oneOf;
			if (!Array.isArray(oneOf)) {
				throw this.error(path, oneOf, "Rule.oneOf must be an array of rules");
			}
			compiledRule.oneOf = this.compileRules(`${path}.oneOf`, oneOf, refs);
		}

		if (unhandledProperties.size > 0) {
			throw this.error(
				path,
				rule,
				`Properties ${[...unhandledProperties].join(", ")} are unknown`
			);
		}

		return compiledRule;
	}

	/**
	 * Returns compiled condition.
	 * @param {string} path current path
	 * @param {RuleSetLoaderOptions} condition user provided condition value
	 * @returns {Condition} compiled condition
	 */
	compileCondition(path, condition) {
		if (condition === "") {
			return {
				matchWhenEmpty: true,
				fn: (str) => str === ""
			};
		}
		if (!condition) {
			throw this.error(
				path,
				condition,
				"Expected condition but got falsy value"
			);
		}
		if (typeof condition === "string") {
			return {
				matchWhenEmpty: condition.length === 0,
				fn: (str) => typeof str === "string" && str.startsWith(condition)
			};
		}
		if (typeof condition === "function") {
			try {
				return {
					matchWhenEmpty: condition(""),
					fn: /** @type {RuleConditionFunction} */ (condition)
				};
			} catch (_err) {
				throw this.error(
					path,
					condition,
					"Evaluation of condition function threw error"
				);
			}
		}
		if (condition instanceof RegExp) {
			return {
				matchWhenEmpty: condition.test(""),
				fn: (v) => typeof v === "string" && condition.test(v)
			};
		}
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
				`Unexpected ${typeof condition} when condition was expected`
			);
		}

		/** @type {Condition[]} */
		const conditions = [];
		for (const key of Object.keys(condition)) {
			const value = condition[key];
			switch (key) {
				case "or":
					if (value) {
						if (!Array.isArray(value)) {
							throw this.error(
								`${path}.or`,
								condition.or,
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
						let i = 0;
						for (const item of value) {
							conditions.push(this.compileCondition(`${path}.and[${i}]`, item));
							i++;
						}
					}
					break;
				case "glob":
					if (value) {
						conditions.push(this.compileGlobCondition(`${path}.glob`, value));
					}
					break;
				case "not":
					if (value) {
						const matcher = this.compileCondition(`${path}.not`, value);
						const fn = matcher.fn;
						conditions.push({
							matchWhenEmpty: !matcher.matchWhenEmpty,
							fn: /** @type {RuleConditionFunction} */ ((v) => !fn(v))
						});
					}
					break;
				default:
					throw this.error(
						`${path}.${key}`,
						condition[key],
						`Unexpected property ${key} in condition`
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
	 * Returns a compiled glob condition. Unlike a regexp it matches the same way
	 * on every OS: `\` is a path separator in both the pattern and the tested
	 * value, and a relative pattern matches at any depth. Patterns are OR-ed,
	 * a `!` prefix subtracts, and a list of only `!` patterns subtracts from
	 * everything.
	 * @param {string} path current path
	 * @param {string | string[]} glob user provided glob pattern(s)
	 * @returns {Condition} compiled condition
	 */
	compileGlobCondition(path, glob) {
		const globs = Array.isArray(glob) ? glob : [glob];
		if (globs.length === 0) {
			throw this.error(path, glob, "Expected glob pattern, but got empty list");
		}
		/** @type {GlobMatcher[]} */
		const positive = [];
		/** @type {GlobMatcher[]} */
		const negative = [];
		for (let i = 0; i < globs.length; i++) {
			const pattern = globs[i];
			const patternPath = Array.isArray(glob) ? `${path}[${i}]` : path;
			if (typeof pattern !== "string") {
				throw this.error(
					patternPath,
					pattern,
					`Unexpected ${typeof pattern} when glob pattern was expected`
				);
			}
			const negated = pattern.startsWith("!");
			const match = createPathGlobMatcher(negated ? pattern.slice(1) : pattern);
			if (match === null) {
				throw this.error(patternPath, pattern, "Invalid glob pattern");
			}
			(negated ? negative : positive).push(match);
		}
		const match = combineGlobMatchers(positive, negative);
		return {
			matchWhenEmpty: match(""),
			fn: (v) => typeof v === "string" && match(v)
		};
	}

	/**
	 * Combine conditions or.
	 * @param {Condition[]} conditions some conditions
	 * @returns {Condition} merged condition
	 */
	combineConditionsOr(conditions) {
		if (conditions.length === 0) {
			return {
				matchWhenEmpty: false,
				fn: () => false
			};
		} else if (conditions.length === 1) {
			return conditions[0];
		}
		return {
			matchWhenEmpty: conditions.some((c) => c.matchWhenEmpty),
			fn: (v) => conditions.some((c) => c.fn(v))
		};
	}

	/**
	 * Combine conditions and.
	 * @param {Condition[]} conditions some conditions
	 * @returns {Condition} merged condition
	 */
	combineConditionsAnd(conditions) {
		if (conditions.length === 0) {
			return {
				matchWhenEmpty: false,
				fn: () => false
			};
		} else if (conditions.length === 1) {
			return conditions[0];
		}
		return {
			matchWhenEmpty: conditions.every((c) => c.matchWhenEmpty),
			fn: (v) => conditions.every((c) => c.fn(v))
		};
	}

	/**
	 * Returns an error object.
	 * @param {string} path current path
	 * @param {EXPECTED_ANY} value value at the error location
	 * @param {string} message message explaining the problem
	 * @returns {Error} an error object
	 */
	error(path, value, message) {
		return new Error(
			`Compiling RuleSet failed: ${message} (at ${path}: ${value})`
		);
	}

	/**
	 * Best-effort detection of a user-registered loader (or explicit module type)
	 * for a resource, without building the whole rule set. Used to resolve the
	 * `experiments.css`/`experiments.html`/`experiments.asyncWebAssembly` "auto"
	 * defaults: when the user already handles these files the built-in module type
	 * stays off, so enabling it by default is non-breaking.
	 *
	 * `include`/`exclude` are treated leniently — a matching `test`/`resource`/
	 * `include` with a loader counts even when another condition would narrow it —
	 * so a loader scoped to e.g. `include: /src/` still keeps the built-in type off
	 * and those files are not double-processed. `enforce: "pre"`/`"post"` loaders
	 * are ignored: they don't establish the module type (e.g. a stylelint pre-loader
	 * must not suppress the built-in css type). A `test` regexp that references the
	 * extension (e.g. `/source\.css$/`) also counts even if the sample path itself
	 * doesn't match, so a loader scoped to specific filenames is still detected; a
	 * `glob` condition naming the extension counts the same way.
	 * @param {import("../../declarations/WebpackOptions").RuleSetRules | undefined} rules user `module.rules`
	 * @param {string} resource sample resource path (e.g. `"/file.css"`)
	 * @param {boolean=} inherited whether an enclosing rule already matched the resource
	 * @returns {boolean} whether a rule assigns a loader or module type to the resource
	 */
	static hasRuleForResource(rules, resource, inherited = false) {
		if (!rules) return false;
		// `\.css` for `/file.css`, `\.wasm` for `/file.wasm`, …
		const extProbe = `\\.${resource.slice(resource.lastIndexOf(".") + 1)}`;
		for (const rule of rules) {
			if (!rule || typeof rule !== "object") continue;
			const matched =
				inherited ||
				matchesResource(rule.test, resource, extProbe) ||
				matchesResource(rule.resource, resource, extProbe) ||
				matchesResource(rule.include, resource, extProbe) ||
				// the rule-level `glob` selects the resource as well
				matchesResource(
					rule.glob === undefined ? undefined : { glob: rule.glob },
					resource,
					extProbe
				);
			const establishesType =
				rule.type !== undefined ||
				((rule.use !== undefined || rule.loader !== undefined) &&
					rule.enforce === undefined);
			if (matched && establishesType) return true;
			if (
				rule.oneOf &&
				RuleSetCompiler.hasRuleForResource(rule.oneOf, resource, matched)
			) {
				return true;
			}
			if (
				rule.rules &&
				RuleSetCompiler.hasRuleForResource(rule.rules, resource, matched)
			) {
				return true;
			}
		}
		return false;
	}
}

// Bare compiler reused to match single conditions via `compileCondition`
// (no plugins needed); created lazily on first use.
/** @type {RuleSetCompiler | undefined} */
let conditionCompiler;

/**
 * Matches a single rule condition against a sample string, reusing the ruleset
 * condition logic (string/regexp/function/array/and/or/not).
 * @param {RuleSetConditionAbsolute | undefined} condition condition
 * @param {string} resource sample resource path
 * @returns {boolean} whether the condition matches
 */
const matchRuleSetCondition = (condition, resource) => {
	if (condition === undefined) return false;
	if (conditionCompiler === undefined) {
		conditionCompiler = new RuleSetCompiler([]);
	}
	try {
		return conditionCompiler
			.compileCondition("ruleSet", condition)
			.fn(resource);
	} catch (_err) {
		return false;
	}
};

/**
 * @param {EXPECTED_ANY} glob glob pattern(s)
 * @param {string} extension extension including the dot (e.g. `".css"`)
 * @returns {boolean} whether a pattern targets the extension
 */
const globReferencesExtension = (glob, extension) => {
	// a `!` pattern subtracts the extension instead of targeting it
	if (typeof glob === "string") {
		return !glob.startsWith("!") && glob.includes(extension);
	}
	return (
		Array.isArray(glob) &&
		glob.some((pattern) => globReferencesExtension(pattern, extension))
	);
};

/**
 * Whether any regexp or glob in the condition references the extension probe
 * (e.g. `\.css`), i.e. the rule clearly targets that extension even if the
 * generic sample path doesn't match its (possibly filename-scoped) pattern.
 * @param {EXPECTED_ANY} condition condition
 * @param {string} extProbe escaped extension probe (e.g. `"\\.css"`)
 * @returns {boolean} whether a regexp in the condition targets the extension
 */
const conditionReferencesExtension = (condition, extProbe) => {
	if (condition instanceof RegExp) return condition.source.includes(extProbe);
	if (Array.isArray(condition)) {
		return condition.some((c) => conditionReferencesExtension(c, extProbe));
	}
	if (condition && typeof condition === "object") {
		return (
			// `\.css` → `.css`
			globReferencesExtension(condition.glob, extProbe.slice(1)) ||
			conditionReferencesExtension(condition.and, extProbe) ||
			conditionReferencesExtension(condition.or, extProbe)
		);
	}
	return false;
};

/**
 * A condition counts as targeting the resource if it matches the sample path or
 * references the extension via a regexp or glob.
 * @param {RuleSetConditionAbsolute | undefined} condition condition
 * @param {string} resource sample resource path
 * @param {string} extProbe escaped extension probe (e.g. `"\\.css"`)
 * @returns {boolean} whether the condition targets the resource's extension
 */
const matchesResource = (condition, resource, extProbe) =>
	condition !== undefined &&
	(matchRuleSetCondition(condition, resource) ||
		conditionReferencesExtension(condition, extProbe));

/**
 * Collects the outermost rules that never matched. A rule below an unused one is
 * unused only because of its parent, so its subtree is not descended into.
 * @param {CompiledRule[]} rules compiled rules
 * @param {CompiledRule[]} result where unused rules are collected
 * @returns {void}
 */
const collectUnusedRules = (rules, result) => {
	for (const rule of rules) {
		if (!rule.used) {
			result.push(rule);
			continue;
		}
		if (rule.rules) collectUnusedRules(rule.rules, result);
		if (rule.oneOf) collectUnusedRules(rule.oneOf, result);
	}
};

module.exports = RuleSetCompiler;
