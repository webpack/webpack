/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ContextModule = require("../ContextModule");
const BroadContextsWarning = require("../errors/BroadContextsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../errors/BroadContextsWarning").BroadContextDetails} BroadContextDetails */

const PLUGIN_NAME = "BroadContextsPlugin";

// Enough to name the offenders without printing every context in the build.
const MAX_REPORTED_CONTEXTS = 5;

// A directory holding a handful of files costs little however it is matched,
// and warning about it would bury the contexts that do carry weight.
const MIN_REPORTED_MODULES = 20;

// A bare leading wildcard takes every name in the directory, whether it is
// `require.context`'s default or one webpack derived from an expression.
const WILDCARD_PREFIX = "^\\.\\/.*";

/**
 * Whether a context takes whatever the directory holds. A pattern that narrows
 * by anything other than a leading wildcard is left alone, as is one webpack
 * cannot read — an unrecognized filter is never guessed at.
 * @param {ContextModule} module a context module
 * @returns {boolean} true when nothing narrows it
 */
const isBroad = (module) => {
	const { regExp, include, exclude } = module.options;

	if (include || exclude) return false;

	return (
		Boolean(regExp) &&
		/** @type {RegExp} */ (regExp).source.startsWith(WILDCARD_PREFIX)
	);
};

class BroadContextsPlugin {
	/**
	 * Creates an instance of BroadContextsPlugin.
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

		if (!hints) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { moduleGraph, requestShortener } = compilation;
				/** @type {BroadContextDetails[]} */
				const broad = [];

				for (const module of compilation.modules) {
					if (!(module instanceof ContextModule)) continue;
					if (!isBroad(module)) continue;

					// One file is reached under several requests — with and without its
					// extension — so the dependencies outnumber what is really matched.
					/** @type {Set<Module>} */
					const matched = new Set();

					/**
					 * @param {Dependency[]} dependencies the dependencies to walk
					 * @returns {void}
					 */
					const collect = (dependencies) => {
						for (const dependency of dependencies) {
							const matchedModule = moduleGraph.getModule(dependency);

							if (matchedModule) matched.add(matchedModule);
						}
					};

					collect(module.dependencies);

					// A lazy context keeps each match in a block of its own, so reading
					// only `dependencies` would report it as matching nothing.
					for (const block of module.blocks) collect(block.dependencies);

					if (matched.size < MIN_REPORTED_MODULES) continue;

					let size = 0;

					for (const matchedModule of matched) {
						size += getModuleSize(matchedModule);
					}

					broad.push({
						name: module.readableIdentifier(requestShortener),
						modules: matched.size,
						size
					});
				}

				if (broad.length === 0) return;

				// Ties break by name: module order is not stable across runs.
				broad.sort((a, b) => b.size - a.size || compareStrings(a.name, b.name));

				const warning = new BroadContextsWarning(
					broad.slice(0, MAX_REPORTED_CONTEXTS),
					broad.length
				);

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

module.exports = BroadContextsPlugin;
