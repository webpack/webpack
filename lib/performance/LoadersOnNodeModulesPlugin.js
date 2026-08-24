/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NormalModule = require("../NormalModule");
const LoadersOnNodeModulesWarning = require("../errors/LoadersOnNodeModulesWarning");
const { compareStrings } = require("../util/comparators");
const {
	WINDOWS_PATH_SEPARATOR_REGEXP,
	contextify
} = require("../util/identifier");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { LoaderOnDependenciesDetails } from "../errors/LoadersOnNodeModulesWarning" */

const PLUGIN_NAME = "LoadersOnNodeModulesPlugin";

// Enough to name the rules at fault without listing every loader.
const MAX_REPORTED_LOADERS = 5;

// A handful is a dependency deliberately transpiled; a crowd is a rule that
// forgot to exclude them.
const MIN_REPORTED_MODULES = 10;

class LoadersOnNodeModulesPlugin {
	/**
	 * Creates an instance of LoadersOnNodeModulesPlugin.
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
				/** @type {Map<string, number>} */
				const counts = new Map();
				let total = 0;

				for (const module of compilation.modules) {
					if (!(module instanceof NormalModule)) continue;
					if (module.loaders.length === 0) continue;

					const resource = module.resource;

					if (!resource) continue;

					// Separators normalized so one check serves both platforms.
					const path = resource.replace(WINDOWS_PATH_SEPARATOR_REGEXP, "/");

					if (!path.includes("/node_modules/")) continue;

					total++;

					for (const { loader } of module.loaders) {
						counts.set(loader, (counts.get(loader) || 0) + 1);
					}
				}

				/** @type {LoaderOnDependenciesDetails[]} */
				const loaders = [];

				for (const [loader, modules] of counts) {
					if (modules < MIN_REPORTED_MODULES) continue;

					loaders.push({
						loader: contextify(compiler.context, loader, compiler.root),
						modules
					});
				}

				if (loaders.length === 0) return;

				// Busiest first; ties break by name, since module order is not stable.
				loaders.sort(
					(a, b) => b.modules - a.modules || compareStrings(a.loader, b.loader)
				);

				const warning = new LoadersOnNodeModulesWarning(
					loaders.slice(0, MAX_REPORTED_LOADERS),
					total
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

module.exports = LoadersOnNodeModulesPlugin;
