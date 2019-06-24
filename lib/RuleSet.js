/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*
<rules>: <rule>
<rules>: [<rule>]
<rule>: {
	resource: {
		test: <condition>,
		include: <condition>,
		exclude: <condition>,
	},
	resource: <condition>, -> resource.test
	test: <condition>, -> resource.test
	include: <condition>, -> resource.include
	exclude: <condition>, -> resource.exclude
	resourceQuery: <condition>,
	compiler: <condition>,
	issuer: <condition>,
	use: "loader", -> use[0].loader
	loader: <>, -> use[0].loader
	loaders: <>, -> use
	options: {}, -> use[0].options,
	query: {}, -> options
	parser: {},
	use: [
		"loader" -> use[x].loader
	],
	use: [
		{
			loader: "loader",
			options: {}
		}
	],
	rules: [
		<rule>
	],
	oneOf: [
		<rule>
	]
}

<condition>: /regExp/
<condition>: function(arg) {}
<condition>: "starting"
<condition>: [<condition>] // or
<condition>: { and: [<condition>] }
<condition>: { or: [<condition>] }
<condition>: { not: [<condition>] }
<condition>: { test: <condition>, include: <condition>, exclude: <condition> }


normalized:

{
	resource: function(),
	resourceQuery: function(),
	compiler: function(),
	issuer: function(),
	use: [
		{
			loader: string,
			options: string,
			<any>: <any>
		}
	],
	rules: [<rule>],
	oneOf: [<rule>],
	<any>: <any>,
}

*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").RuleSetConditionAbsolute} RuleCondition */
/** @typedef {function(string): boolean} NormalizedRuleCondition */

/**
 * Applying `not` condition
 * @param {NormalizedRuleCondition} matcher - provided condition
 * @returns {NormalizedRuleCondition} - new condition
 */
const notMatcher = matcher => {
	return str => {
		return !matcher(str);
	};
};

/**
 * Applying `or` between conditions
 * @param {Array<NormalizedRuleCondition>} items - provided conditions
 * @returns {NormalizedRuleCondition} - new condition
 */
const orMatcher = items => {
	return str => {
		for (let i = 0; i < items.length; i++) {
			if (items[i](str)) return true;
		}
		return false;
	};
};

/**
 * Applying `and` between conditions
 * @param {Array<NormalizedRuleCondition>} items - provided conditions
 * @returns {NormalizedRuleCondition} - new condition
 */
const andMatcher = items => {
	return str => {
		for (let i = 0; i < items.length; i++) {
			if (!items[i](str)) return false;
		}
		return true;
	};
};

/** @typedef {import("../declarations/WebpackOptions").RuleSetQuery} RuleSetQuery */
/** @typedef {import("../declarations/WebpackOptions").RuleSetLoader} RuleSetLoader */
/** @typedef {{loader?: RuleSetLoader, options?: RuleSetQuery, query?: RuleSetQuery}} RuleSetUseOptionsItem **/
/** @typedef {import("../declarations/WebpackOptions").RuleSetUse} RuleSetUse */
/** @typedef {{ident?: string, loader?: RuleSetLoader, options?: RuleSetQuery}} NormalizedRuleUse **/

/** @typedef {import("../declarations/WebpackOptions").RuleSetRules} RuleSetRules */
/** @typedef {import("../declarations/WebpackOptions").RuleSetRule} RuleSetRule */
/** @typedef {import("../declarations/WebpackOptions").ResolveOptions} ResolveOptions */

/**
 * @typedef {object} NormalizedRule
 * @property {NormalizedRuleCondition} [resource]
 * @property {NormalizedRuleCondition} [resourceQuery]
 * @property {NormalizedRuleCondition} [realResource]
 * @property {NormalizedRuleCondition} [compiler]
 * @property {NormalizedRuleCondition} [issuer]
 * @property {Function | Array<NormalizedRuleUse | Function>} [use]
 * @property {Array<NormalizedRule>} [rules]
 * @property {Array<NormalizedRule>} [oneOf]
 *
 * rest parameters from {@link RuleSetRule}
 * @property {"pre" | "post"} [enforce]
 * @property {{[k: string]: any}} [parser]
 * @property {ResolveOptions} [resolve]
 * @property {boolean} [sideEffects]
 * @property {"javascript/auto" | "javascript/dynamic" | "javascript/esm" | "json" | "webassembly/experimental"} [type]
 */

/** @typedef {Array<{type: string, enforce?: "pre" | "post", value: any}>} ExecResult */
/** @typedef {{resource?: string, realResource?: string, resourceQuery?: string, compiler?: string, issuer?: string, [k: string]: string}} ExecDataParam */

module.exports = class RuleSet {
	/**
	 * @param {RuleSetRules} rules - WebpackOptions.ModuleOptions.RuleSetRules
	 */
	constructor(rules) {
		/**
		 * Cache for `use` rules references. {@link NormalizedRuleUse.options} as value
		 * @type {{[key: string]: RuleSetQuery}}
		 */
		this.references = Object.create(null);
		/**
		 * @type {Array<NormalizedRule>}
		 */
		this.rules = RuleSet.normalizeRules(rules, this.references, "ref-");
	}

	/**
	 * Normalizing WebpackOptions.ModuleOptions.RuleSetRules
	 * @param {RuleSetRules} rules - options rules
	 * @param {object} refs - cache for rules references
	 * @param {string} ident - current identity prefix
	 * @returns {Array<NormalizedRule>} - normalized rules
	 */
	static normalizeRules(rules, refs, ident) {
		if (Array.isArray(rules)) {
			return rules.map((rule, idx) => {
				return RuleSet.normalizeRule(rule, refs, `${ident}-${idx}`);
			});
		} else if (rules) {
			return [RuleSet.normalizeRule(rules, refs, ident)];
		} else {
			return [];
		}
	}

	/**
	 * Normalizing WebpackOptions.ModuleOptions.RuleSetRule
	 * @param {RuleSetRule} rule - options rule
	 * @param {object} refs - cache for rules references
	 * @param {string} ident - current identity prefix
	 * @returns {NormalizedRule} - normalized rule
	 * @throws {Error} - throws error, if rule is not `object` or `string`
	 * @throws {Error} - throws error, if options/query used with loader property in `use` definition
	 * @throws {Error} - throws error, if options/query provided without string loader
	 */
	static normalizeRule(rule, refs, ident) {
		/**
		 * Returns {@link NormalizedRule} with NormalizedRuleUse.loader equals to rule, if rule is a string literal
		 */
		if (typeof rule === "string") {
			return {
				use: [
					{
						loader: rule
					}
				]
			};
		}
		if (!rule) {
			throw new Error("Unexcepted null when object was expected as rule");
		}
		if (typeof rule !== "object") {
			throw new Error(
				"Unexcepted " +
					typeof rule +
					" when object was expected as rule (" +
					rule +
					")"
			);
		}

		/**
		 * @type {NormalizedRule}
		 */
		const newRule = {};
		/**
		 * @type {string}
		 */
		let useSource;
		/**
		 * @type {string}
		 */
		let resourceSource;
		/**
		 * Condition for choosing file
		 * @type {object}
		 */
		let condition;

		/**
		 * Checking that use source condition is not defined more than one time
		 * @param {string} newSource - new source
		 * @throws {Error} - throws error, if sources are different
		 * @returns {void}
		 */
		const checkUseSource = newSource => {
			if (useSource && useSource !== newSource) {
				throw new Error(
					RuleSet.buildErrorMessage(
						rule,
						new Error(
							"Rule can only have one result source (provided " +
								newSource +
								" and " +
								useSource +
								")"
						)
					)
				);
			}
			useSource = newSource;
		};

		/**
		 * Checking that resource source condition is not defined more than one time
		 * @param {string} newSource - new source
		 * @throws {Error} - throws error, if sources are different
		 * @returns {void}
		 */
		const checkResourceSource = newSource => {
			if (resourceSource && resourceSource !== newSource) {
				throw new Error(
					RuleSet.buildErrorMessage(
						rule,
						new Error(
							"Rule can only have one resource source (provided " +
								newSource +
								" and " +
								resourceSource +
								")"
						)
					)
				);
			}
			resourceSource = newSource;
		};

		if (rule.test || rule.include || rule.exclude) {
			checkResourceSource("test + include + exclude");
			condition = {
				test: rule.test,
				include: rule.include,
				exclude: rule.exclude
			};
			try {
				newRule.resource = RuleSet.normalizeCondition(condition);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(condition, error));
			}
		}

		if (rule.resource) {
			checkResourceSource("resource");
			try {
				newRule.resource = RuleSet.normalizeCondition(rule.resource);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(rule.resource, error));
			}
		}

		if (rule.realResource) {
			try {
				newRule.realResource = RuleSet.normalizeCondition(rule.realResource);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(rule.realResource, error));
			}
		}

		if (rule.resourceQuery) {
			try {
				newRule.resourceQuery = RuleSet.normalizeCondition(rule.resourceQuery);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(rule.resourceQuery, error));
			}
		}

		if (rule.compiler) {
			try {
				newRule.compiler = RuleSet.normalizeCondition(rule.compiler);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(rule.compiler, error));
			}
		}

		if (rule.issuer) {
			try {
				newRule.issuer = RuleSet.normalizeCondition(rule.issuer);
			} catch (error) {
				throw new Error(RuleSet.buildErrorMessage(rule.issuer, error));
			}
		}

		if (rule.loader && rule.loaders) {
			throw new Error(
				RuleSet.buildErrorMessage(
					rule,
					new Error(
						"Provided loader and loaders for rule (use only one of them)"
					)
				)
			);
		}

		const loader = rule.loaders || rule.loader;
		if (typeof loader === "string" && !rule.options && !rule.query) {
			checkUseSource("loader");
			newRule.use = RuleSet.normalizeUse(loader.split("!"), ident);
		} else if (typeof loader === "string" && (rule.options || rule.query)) {
			checkUseSource("loader + options/query");
			newRule.use = RuleSet.normalizeUse(
				{
					loader: loader,
					options: rule.options,
					query: rule.query
				},
				ident
			);
		} else if (loader && (rule.options || rule.query)) {
			throw new Error(
				RuleSet.buildErrorMessage(
					rule,
					new Error(
						"options/query cannot be used with loaders (use options for each array item)"
					)
				)
			);
		} else if (loader) {
			checkUseSource("loaders");
			newRule.use = RuleSet.normalizeUse(loader, ident);
		} else if (rule.options || rule.query) {
			throw new Error(
				RuleSet.buildErrorMessage(
					rule,
					new Error(
						"options/query provided without loader (use loader + options)"
					)
				)
			);
		}

		if (rule.use) {
			checkUseSource("use");
			newRule.use = RuleSet.normalizeUse(rule.use, ident);
		}

		if (rule.rules) {
			newRule.rules = RuleSet.normalizeRules(
				rule.rules,
				refs,
				`${ident}-rules`
			);
		}

		if (rule.oneOf) {
			newRule.oneOf = RuleSet.normalizeRules(
				rule.oneOf,
				refs,
				`${ident}-oneOf`
			);
		}

		const keys = Object.keys(rule).filter(key => {
			return ![
				"resource",
				"resourceQuery",
				"compiler",
				"test",
				"include",
				"exclude",
				"issuer",
				"loader",
				"options",
				"query",
				"loaders",
				"use",
				"rules",
				"oneOf"
			].includes(key);
		});
		for (const key of keys) {
			newRule[key] = rule[key];
		}

		if (Array.isArray(newRule.use)) {
			for (const item of newRule.use) {
				if (typeof item !== "function" && item.ident) {
					refs[item.ident] = item.options;
				}
			}
		}

		return newRule;
	}

	/**
	 * Creating custom error message
	 * @param {RuleCondition} condition - rule condition
	 * @param {Error} error - provided error
	 * @returns {string} - error message
	 * @example
	 * const rule = {test: /\.scss$/}
	 * const err = new Error(RuleSet.buildErrorMessage(rule,
	 *  new Error("Provided loader and loaders for rule (use only one of them)")))
	 *  // error.message = "Provided loader and loaders for rule (use only one of them) in {"test":{}}"
	 */
	static buildErrorMessage(condition, error) {
		const conditionAsText = JSON.stringify(
			condition,
			(key, value) => {
				return value === undefined ? "undefined" : value;
			},
			2
		);
		return error.message + " in " + conditionAsText;
	}

	/**
	 * Normalizing `use` definition
	 * @param {RuleSetUse} use - current `use` definition
	 * @param {string} ident - current identity prefix
	 * @returns {Function | Array<NormalizedRuleUse | Function>} - normalized form
	 */
	static normalizeUse(use, ident) {
		if (typeof use === "function") {
			return data => RuleSet.normalizeUse(use(data), ident);
		}
		if (Array.isArray(use)) {
			return use
				.map((item, idx) => RuleSet.normalizeUse(item, `${ident}-${idx}`))
				.reduce(
					/**
					 * @param {Array<NormalizedRuleUse | Function>} arr - aggregated array
					 * @param {Array<NormalizedRuleUse | Function>} items - current items
					 * @returns {Array<NormalizedRuleUse | Function>} - normalized form
					 */
					function reducer(arr, items) {
						return arr.concat(items);
					},
					[]
				);
		}
		return [RuleSet.normalizeUseItem(use, ident)];
	}

	/**
	 * Normalizing `use` item
	 * @param {RuleSetLoader} useItemString - `use` item definition, example string `sass-loader?outputStyle=compressed`
	 * @returns {NormalizedRuleUse} - normalized `use` definition
	 */
	static normalizeUseItemString(useItemString) {
		const idx = useItemString.indexOf("?");
		if (idx >= 0) {
			return {
				loader: useItemString.substr(0, idx),
				options: useItemString.substr(idx + 1)
			};
		}
		return {
			loader: useItemString,
			options: undefined
		};
	}

	/**
	 * Normalizing `use` item definition
	 * @param {RuleSetLoader | RuleSetUseOptionsItem} item - current `use` options
	 * @param {string} ident - current identity
	 * @returns {NormalizedRuleUse} - normalized `use` definition
	 */
	static normalizeUseItem(item, ident) {
		if (typeof item === "string") {
			return RuleSet.normalizeUseItemString(item);
		}

		const newItem = {};

		if (item.options && item.query) {
			throw new Error("Provided options and query in use");
		}

		if (!item.loader) {
			throw new Error("No loader specified");
		}

		newItem.options = item.options || item.query;

		/**
		 * Assign ident to normalized form
		 */
		if (typeof newItem.options === "object" && newItem.options) {
			if (newItem.options.ident) {
				newItem.ident = newItem.options.ident;
			} else {
				newItem.ident = ident;
			}
		}

		const keys = Object.keys(item).filter(function(key) {
			return !["options", "query"].includes(key);
		});

		for (const key of keys) {
			newItem[key] = item[key];
		}

		return newItem;
	}

	/**
	 * Normalizing condition
	 * @param {RuleCondition|Array<RuleCondition>} condition - provided rule condition
	 * @returns {NormalizedRuleCondition} - normalized condition
	 * @throws {Error} - throws error, if {@param condition} is falthy
	 * @throws {Error} - throws error, if {@param condition} contains unknown key or values are falthy
	 */
	static normalizeCondition(condition) {
		if (!condition) throw new Error("Expected condition but got falsy value");
		if (typeof condition === "string") {
			return str => str.indexOf(condition) === 0;
		}
		if (typeof condition === "function") {
			return condition;
		}
		if (condition instanceof RegExp) {
			return condition.test.bind(condition);
		}
		/**
		 * Applying `or` operand
		 */
		if (Array.isArray(condition)) {
			const items = condition.map(c => RuleSet.normalizeCondition(c));
			return orMatcher(items);
		}
		if (typeof condition !== "object") {
			throw Error(
				"Unexcepted " +
					typeof condition +
					" when condition was expected (" +
					condition +
					")"
			);
		}

		const matchers = [];
		Object.keys(condition).forEach(key => {
			const value = condition[key];
			switch (key) {
				case "or":
				case "include":
				case "test":
					/**
					 * Applying for `or` as well, because of `Array.isArray(condition)` will call {@link orMatcher} later
					 */
					if (value) matchers.push(RuleSet.normalizeCondition(value));
					break;
				case "and":
					if (value) {
						const items = value.map(c => RuleSet.normalizeCondition(c));
						matchers.push(andMatcher(items));
					}
					break;
				case "not":
				case "exclude":
					if (value) {
						const matcher = RuleSet.normalizeCondition(value);
						matchers.push(notMatcher(matcher));
					}
					break;
				default:
					throw new Error("Unexcepted property " + key + " in condition");
			}
		});
		if (matchers.length === 0) {
			throw new Error("Excepted condition but got " + condition);
		}
		if (matchers.length === 1) {
			return matchers[0];
		}

		/**
		 * Applying `and` for all matchers
		 */
		return andMatcher(matchers);
	}

	/**
	 * Match requested resource
	 * @param {ExecDataParam} data - requested resource
	 * @returns {ExecResult} - response
	 */
	exec(data) {
		const result = [];
		this._run(
			data,
			{
				rules: this.rules
			},
			result
		);
		return result;
	}

	/**
	 * @param {ExecDataParam} data - requested resource
	 * @param {NormalizedRule} rule - normalized rules
	 * @param {ExecResult} result - computed result
	 * @returns {boolean} - success execution status
	 * @private
	 */
	_run(data, rule, result) {
		// test conditions
		if (rule.resource && !data.resource) return false;
		if (rule.realResource && !data.realResource) return false;
		if (rule.resourceQuery && !data.resourceQuery) return false;
		if (rule.compiler && !data.compiler) return false;
		if (rule.issuer && !data.issuer) return false;
		if (rule.resource && !rule.resource(data.resource)) return false;
		if (rule.realResource && !rule.realResource(data.realResource))
			return false;
		if (data.issuer && rule.issuer && !rule.issuer(data.issuer)) return false;
		if (
			data.resourceQuery &&
			rule.resourceQuery &&
			!rule.resourceQuery(data.resourceQuery)
		) {
			return false;
		}
		if (data.compiler && rule.compiler && !rule.compiler(data.compiler)) {
			return false;
		}

		// apply
		const keys = Object.keys(rule).filter(key => {
			return ![
				"resource",
				"realResource",
				"resourceQuery",
				"compiler",
				"issuer",
				"rules",
				"oneOf",
				"use",
				"enforce"
			].includes(key);
		});
		for (const key of keys) {
			result.push({
				type: key,
				value: rule[key]
			});
		}

		if (rule.use) {
			const process = use => {
				if (typeof use === "function") {
					process(use(data));
				} else if (Array.isArray(use)) {
					use.forEach(process);
				} else {
					result.push({
						type: "use",
						value: use,
						enforce: rule.enforce
					});
				}
			};
			process(rule.use);
		}

		if (rule.rules) {
			for (let i = 0; i < rule.rules.length; i++) {
				this._run(data, rule.rules[i], result);
			}
		}

		if (rule.oneOf) {
			for (let i = 0; i < rule.oneOf.length; i++) {
				if (this._run(data, rule.oneOf[i], result)) break;
			}
		}

		return true;
	}

	/**
	 * Gets {@link RuleSetQuery} by identity
	 * @param {string} ident - identity
	 * @returns {RuleSetQuery} - found result
	 * @throws {Error} - throws error, if options does not find
	 */
	findOptionsByIdent(ident) {
		const options = this.references[ident];
		if (!options) {
			throw new Error("Can't find options with ident '" + ident + "'");
		}
		return options;
	}
};
