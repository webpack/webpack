/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const OsDependentRuleWarning = require("../errors/OsDependentRuleWarning");

/**
 * @import {
 * 	Falsy,
 * 	PerformanceOptions,
 * 	RuleSetCondition,
 * 	RuleSetRule
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "OsDependentRuleWarningPlugin";

// Only these carry a path. `resourceQuery`, `resourceFragment`, `mimetype` and
// `scheme` legitimately contain a `/`.
const PATH_PROPERTIES = [
	"test",
	"include",
	"exclude",
	"resource",
	"realResource",
	"issuer"
];

/** @typedef {"posix" | "windows" | undefined} Separator */

/**
 * Which separator a pattern can match, walking its source so an escape is never
 * mistaken for the separator after it (`\.` is not `\\`); both means portable.
 * @param {RegExp} regExp the condition
 * @returns {Separator} the only separator it matches, or `undefined` when it is portable
 */
const onlyMatchedSeparator = (regExp) => {
	const { source } = regExp;
	let posix = false;
	let windows = false;

	for (let i = 0; i < source.length; i++) {
		const character = source[i];

		if (character === "\\") {
			const escaped = source[i + 1];

			if (escaped === "\\") {
				windows = true;
			} else if (escaped === "/") {
				posix = true;
			}

			i++;
		} else if (character === "/") {
			posix = true;
		}
	}

	if (posix === windows) return undefined;

	return posix ? "posix" : "windows";
};

/**
 * @param {RuleSetCondition} condition the condition to walk
 * @param {(regExp: RegExp) => void} callback called for every regexp within
 * @returns {void}
 */
const forEachRegExp = (condition, callback) => {
	if (condition instanceof RegExp) {
		callback(condition);
	} else if (Array.isArray(condition)) {
		for (const item of condition) forEachRegExp(item, callback);
	} else if (condition && typeof condition === "object") {
		// `not` is skipped: negated, a separator says which paths are *excluded*,
		// so the condition still matches the other OS.
		for (const key of ["and", "or"]) {
			const nested = condition[/** @type {keyof typeof condition} */ (key)];

			if (nested !== undefined) {
				forEachRegExp(/** @type {RuleSetCondition} */ (nested), callback);
			}
		}
	}
};

class OsDependentRuleWarningPlugin {
	/**
	 * Creates an instance of OsDependentRuleWarningPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;
		const rules =
			compiler.options.module && compiler.options.module.rules
				? compiler.options.module.rules
				: [];

		/** @type {string[]} */
		const descriptions = [];

		/**
		 * @param {(RuleSetRule | Falsy)[]} ruleSet rules to walk
		 * @param {string} path where `ruleSet` sits in the configuration
		 * @returns {void}
		 */
		const walk = (ruleSet, path) => {
			for (let i = 0; i < ruleSet.length; i++) {
				const rule = ruleSet[i];

				if (!rule || typeof rule !== "object") continue;

				const rulePath = `${path}[${i}]`;

				for (const property of PATH_PROPERTIES) {
					const condition = rule[/** @type {keyof RuleSetRule} */ (property)];

					if (condition === undefined) continue;

					forEachRegExp(
						/** @type {RuleSetCondition} */ (condition),
						(regExp) => {
							const separator = onlyMatchedSeparator(regExp);

							if (separator === undefined) return;

							descriptions.push(
								`${rulePath}.${property} (${regExp}) only matches ${
									separator === "posix" ? "'/'" : "'\\'"
								} paths`
							);
						}
					);
				}

				if (Array.isArray(rule.oneOf)) walk(rule.oneOf, `${rulePath}.oneOf`);
				if (Array.isArray(rule.rules)) walk(rule.rules, `${rulePath}.rules`);
			}
		};

		walk(/** @type {RuleSetRule[]} */ (rules), "module.rules");

		if (descriptions.length === 0) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// Reported past the hash: `createHash` folds every message into it, so
			// a hint pushed earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const warning = new OsDependentRuleWarning(descriptions);

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = OsDependentRuleWarningPlugin;
