/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const ModuleFilenameHelpers = require("../ModuleFilenameHelpers");
const RuntimeGlobals = require("../RuntimeGlobals");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const ResourceHintRuntimeModule = require("./ResourceHintRuntimeModule");
const StartupAssetHintRuntimeModule = require("./StartupAssetHintRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../../declarations/WebpackOptions").ResourceHints} ResourceHintsConfig */
/** @typedef {import("../../declarations/WebpackOptions").ResourceHintsRule} ResourceHintsRule */

/**
 * @typedef {object} ResolvedResourceHints
 * @property {boolean=} prefetch project-wide default for `webpackPrefetch`
 * @property {boolean=} preload project-wide default for `webpackPreload`
 * @property {("low" | "high" | "auto" | false)=} fetchPriority project-wide default for `webpackFetchPriority`
 */

const PLUGIN_NAME = "ResourceHintPlugin";

/** @type {WeakMap<Compilation, (request: string) => ResolvedResourceHints>} */
const compilationResolvers = new WeakMap();

/**
 * Normalizes the user's `output.resourceHints` value to an array of rules.
 * @param {ResourceHintsConfig | undefined} config user config
 * @returns {ResourceHintsRule[]} rules
 */
const normalizeRules = (config) => {
	if (!config) return [];
	return Array.isArray(config) ? config : [config];
};

/**
 * Builds a resolver that returns the merged defaults for a given asset request.
 * Iterates the rules in order; matching rules merge their hint fields, with
 * later matches overriding earlier ones for non-`undefined` fields.
 * @param {ResourceHintsRule[]} rules normalized rules
 * @returns {(request: string) => ResolvedResourceHints} resolver
 */
const createResolver = (rules) => {
	if (rules.length === 0) return () => ({});
	return (request) => {
		/** @type {ResolvedResourceHints} */
		const merged = {};
		for (const rule of rules) {
			if (
				(rule.test !== undefined ||
					rule.include !== undefined ||
					rule.exclude !== undefined) &&
				!ModuleFilenameHelpers.matchObject(
					/** @type {EXPECTED_ANY} */ ({
						test: rule.test,
						include: rule.include,
						exclude: rule.exclude
					}),
					request
				)
			) {
				continue;
			}
			if (rule.prefetch !== undefined) merged.prefetch = rule.prefetch;
			if (rule.preload !== undefined) merged.preload = rule.preload;
			if (rule.fetchPriority !== undefined) {
				merged.fetchPriority = rule.fetchPriority;
			}
		}
		return merged;
	};
};

/**
 * Adds runtime support for `__webpack_require__.PA` / `__webpack_require__.LA`,
 * the helpers that inject `<link rel="prefetch">` / `<link rel="preload">`
 * tags for asset modules referenced via `new URL(..., import.meta.url)` (and,
 * in the future, equivalent URL references in other module types like CSS or
 * HTML — which is why the project-wide defaults live here rather than on the
 * JS parser).
 */
class ResourceHintPlugin {
	/**
	 * @param {ResourceHintsConfig=} options project-wide hint defaults
	 */
	constructor(options) {
		/** @type {ResourceHintsRule[]} */
		this._rules = normalizeRules(options);
	}

	/**
	 * Returns the project-wide resource-hint resolver for this compilation.
	 * The resolver is a function `(request) => { prefetch?, preload?, fetchPriority? }`
	 * that walks the configured `output.resourceHints` rules and returns the
	 * merged defaults for the given asset request. Use this from URL-emitting
	 * parser plugins (`URLParserPlugin` for JS today, `CssParser` for `url(...)`,
	 * etc.) so all URL kinds share the same per-project defaults.
	 * @param {Compilation} compilation compilation
	 * @returns {(request: string) => ResolvedResourceHints} resolver
	 */
	static getCompilationResolver(compilation) {
		return compilationResolvers.get(compilation) || (() => ({}));
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const resolver = createResolver(this._rules);
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilationResolvers.set(compilation, resolver);
			// CSS `url(...)` and HTML `<img src>` / `<link href>` deps store
			// hint flags but their dep templates don't run for the JS
			// output, so we need to lift those flags into the JS chunk's
			// runtime requirements ourselves.
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					let hasPrefetch = false;
					let hasPreload = false;
					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						const deps =
							/** @type {{ dependencies?: import("../Dependency")[] }} */
							(module).dependencies;
						if (!deps) continue;
						for (const dep of deps) {
							if (
								!(dep instanceof CssUrlDependency) &&
								!(dep instanceof HtmlSourceDependency)
							) {
								continue;
							}
							if (dep.prefetch) hasPrefetch = true;
							if (dep.preload) hasPreload = true;
							if (hasPrefetch && hasPreload) break;
						}
						if (hasPrefetch && hasPreload) break;
					}
					// Attach the startup-hint runtime module to *this* chunk
					// (covering async chunks too) — `runtimeRequirementInTree`
					// alone would only attach it to the runtime chunk, so a
					// hinted `new URL(...)` in an async chunk would never
					// fire its `<link>` injection. We add it whenever this
					// chunk already pulls in `startupAssetHints` (via JS
					// `URLDependency` template) or whenever CSS / HTML lifts
					// it in here.
					if (
						hasPrefetch ||
						hasPreload ||
						set.has(RuntimeGlobals.startupAssetHints)
					) {
						set.add(RuntimeGlobals.startupAssetHints);
						// CSS-only asset modules aren't in JS `__webpack_modules__`,
						// so the startup-hint runtime falls back to
						// `__webpack_require__.p + "filename"`. Make sure
						// `publicPath` is in this chunk's runtime.
						set.add(RuntimeGlobals.publicPath);
						if (hasPrefetch) set.add(RuntimeGlobals.prefetchAsset);
						if (hasPreload) set.add(RuntimeGlobals.preloadAsset);
						compilation.addRuntimeModule(
							chunk,
							new StartupAssetHintRuntimeModule()
						);
					}
				}
			);
			for (const [rel, runtimeGlobal] of /** @type {const} */ ([
				["prefetch", RuntimeGlobals.prefetchAsset],
				["preload", RuntimeGlobals.preloadAsset]
			])) {
				compilation.hooks.runtimeRequirementInTree
					.for(runtimeGlobal)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addRuntimeModule(
							chunk,
							new ResourceHintRuntimeModule(rel)
						);
					});
			}
		});
	}
}

module.exports = ResourceHintPlugin;
