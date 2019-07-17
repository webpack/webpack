/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").RuleSetLoader} WebpackOptionsRuleSetLoader */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetLoaderOptions} WebpackOptionsRuleSetLoaderOptions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule} WebpackOptionsRuleSet */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetUse} RuleSetUse */

/** @typedef {import("./RuleSetCompiler")} RuleSetCompiler */
/** @typedef {import("./RuleSetCompiler").CompiledRule} CompiledRule */
/** @typedef {import("./RuleSetCompiler").Effect} Effect */
/** @typedef {import("./RuleSetCompiler").RuleSetProperty} RuleSetProperty */

/**
 * @typedef {object} UseRule
 * @property {RuleSetUse|WebpackOptionsRuleSetLoader=} loader
 * @property {WebpackOptionsRuleSetLoaderOptions=} options
 * @property {string=} ident
 */

/** @typedef {function(any): UseDefinitions} UseAsFunction */
/** @typedef {string|UseRule|UseAsFunction} UseDefinition */
/** @typedef {Array<UseDefinition>|UseDefinition} UseDefinitions */

/**
 * Extracts `effects` from `use` or `loader` properties in WebpackOptions.RuleSetRule
 */
class UseEffectRulePlugin {
	/**
	 * @param {RuleSetCompiler} ruleSetCompiler the rule set compiler
	 * @returns {void}
	 */
	apply(ruleSetCompiler) {
		ruleSetCompiler.hooks.rule.tap(
			"UseEffectRulePlugin",
			/**
			 * @param {string} path path
			 * @param {WebpackOptionsRuleSet} rule rule set
			 * @param {Set<RuleSetProperty>} unhandledProperties unhandled properties
			 * @param {CompiledRule} result compilation result
			 * @param {Map<string, WebpackOptionsRuleSetLoaderOptions>} references references
			 * @returns {void}
			 */
			(path, rule, unhandledProperties, result, references) => {
				/**
				 * Check contradictions
				 * @param {RuleSetProperty} property property
				 * @param {RuleSetProperty} correctProperty correct property
				 * @returns {void}
				 * @throws {Error} throws error, if contradiction was found
				 */
				const conflictWith = (property, correctProperty) => {
					if (unhandledProperties.has(property)) {
						throw ruleSetCompiler.error(
							`${path}.${property}`,
							rule[property],
							`A Rule must not have a '${property}' property when it has a '${correctProperty}' property`
						);
					}
				};

				unhandledProperties.delete("enforce");

				/** @type {string} */
				const type = rule.enforce ? `use-${rule.enforce}` : "use";

				if (unhandledProperties.has("use")) {
					unhandledProperties.delete("use");

					conflictWith("loader", "use");
					conflictWith("options", "use");

					/** @typedef {RuleSetUse} */
					const use = rule.use;

					/**
					 * @param {string} defaultIdent default ident when none is provided
					 * @param {UseDefinition} item user provided use value
					 * @returns {Effect|function(any): Effect[]} effect
					 */
					const useToEffect = (defaultIdent, item) => {
						if (typeof item === "function") {
							return data =>
								useToEffectsWithoutIdent(
									/** @type {string|UseRule|Array<string|UseRule>} */ (item(
										data
									))
								);
						} else {
							return useToEffectRaw(defaultIdent, item);
						}
					};

					/**
					 *
					 * @param {string} defaultIdent default ident when none is provided
					 * @param {string|UseRule} item user provided use value
					 * @returns {Effect} effect
					 */
					const useToEffectRaw = (defaultIdent, item) => {
						if (typeof item === "string") {
							return ruleSetCompiler.createEffect(type, {
								loader: item,
								options: undefined,
								ident: undefined
							});
						} else {
							const loader = item.loader;
							const options = item.options;
							let ident = item.ident;
							if (options && typeof options === "object") {
								if (!ident) ident = defaultIdent;
								references.set(ident, options);
							}
							return ruleSetCompiler.createEffect(type, {
								loader,
								options,
								ident
							});
						}
					};

					/**
					 * @param {Array<string|UseRule>|string|UseRule} items user provided use value
					 * @returns {Effect[]} effects
					 */
					const useToEffectsWithoutIdent = items => {
						if (Array.isArray(items)) {
							return items.map(item =>
								useToEffectRaw("[[missing ident]]", item)
							);
						}
						return [useToEffectRaw("[[missing ident]]", items)];
					};

					/**
					 * @param {string} path current path
					 * @param {UseDefinitions} items user provided use value
					 * @returns {(Effect|function(any): Effect[])[]} effects
					 */
					const useToEffects = (path, items) => {
						if (Array.isArray(items)) {
							return items.map((item, idx) =>
								useToEffect(`${path}[${idx}]`, item)
							);
						}
						return [useToEffect(path, items)];
					};

					if (typeof use === "function") {
						result.effects.push(data =>
							useToEffectsWithoutIdent(
								/** @type {Array<string|UseRule>|string|UseRule} */ (use(data))
							)
						);
					} else {
						for (const effect of useToEffects(`${path}.use`, use)) {
							result.effects.push(effect);
						}
					}
				}

				if (unhandledProperties.has("loader")) {
					unhandledProperties.delete("loader");
					unhandledProperties.delete("options");

					/** @typedef {WebpackOptionsRuleSetLoader} */
					const loader =
						/** @type {WebpackOptionsRuleSetLoader} */ (rule.loader);
					/** @typedef {WebpackOptionsRuleSetLoaderOptions} */
					const options = rule.options;

					if (loader.includes("!")) {
						throw ruleSetCompiler.error(
							`${path}.loader`,
							loader,
							"Exclamation mark separated loader lists has been removed in favor of the 'use' property with arrays"
						);
					}

					if (loader.includes("?")) {
						throw ruleSetCompiler.error(
							`${path}.loader`,
							loader,
							"Query arguments on 'loader' has been removed in favor of the 'options' property"
						);
					}

					result.effects.push(
						ruleSetCompiler.createEffect(type, {
							loader,
							options,
							ident: options && typeof options === "object" ? path : undefined
						})
					);
				}
			}
		);
	}

	useItemToEffects(path, item) {}
}

module.exports = UseEffectRulePlugin;
