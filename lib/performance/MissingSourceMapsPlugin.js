/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SourceMapSource } = require("webpack-sources");
const NormalModule = require("../NormalModule");
const MissingSourceMapsWarning = require("../errors/MissingSourceMapsWarning");
const { compareStrings } = require("../util/comparators");
const getSourceModules = require("./getSourceModules");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import RequestShortener from "../RequestShortener" */
/** @import { MissingSourceMapDetails } from "../errors/MissingSourceMapsWarning" */

const PLUGIN_NAME = "MissingSourceMapsPlugin";

// Enough to name the offenders without listing every module a loader touched.
const MAX_REPORTED_MODULES = 5;

/**
 * The loaders that ran on a module, shortened for reading.
 * @param {NormalModule} module the module
 * @param {RequestShortener} requestShortener the request shortener
 * @returns {string[]} what to call them
 */
const loaderNames = (module, requestShortener) =>
	module.loaders.map((it) => requestShortener.shorten(it.loader) || it.loader);

class MissingSourceMapsPlugin {
	/**
	 * Creates an instance of MissingSourceMapsPlugin.
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
				const { requestShortener } = compilation;
				/** @type {MissingSourceMapDetails[]} */
				const found = [];

				// A module can be reached both on its own and inside a
				// concatenation, so it is only counted the first time.
				/** @type {Set<Module>} */
				const seen = new Set();

				for (const parent of compilation.modules) {
					// Scope hoisting makes several modules into one, and each of them
					// kept the source its own loaders produced.
					for (const module of getSourceModules(parent)) {
						if (seen.has(module)) continue;

						seen.add(module);

						if (!(module instanceof NormalModule)) continue;

						// Only where a real map was asked for: the cheap devtools map to
						// the loader output by design, so nothing is lost there.
						if (!module.useSourceMap) continue;
						if (module.loaders.length === 0) continue;

						// A loader that returned a map produces a `SourceMapSource`;
						// falling back to any other source is the map being dropped.
						if (module.originalSource() instanceof SourceMapSource) continue;

						found.push({
							name: module.readableIdentifier(requestShortener),
							loaders: loaderNames(module, requestShortener)
						});
					}
				}

				if (found.length === 0) return;

				// By name: module order is not stable across runs.
				found.sort((a, b) => compareStrings(a.name, b.name));

				const warning = new MissingSourceMapsWarning(
					found.slice(0, MAX_REPORTED_MODULES),
					found.length
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

module.exports = MissingSourceMapsPlugin;
