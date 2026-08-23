/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const MixedExportsWarning = require("../errors/MixedExportsWarning");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { MixedExportsDetails } from "../errors/MixedExportsWarning" */

const PLUGIN_NAME = "MixedExportsPlugin";

// Enough to name the offenders without listing every entry.
const MAX_REPORTED_ENTRIES = 5;

// Only these hand the namespace object straight to `require()`, so only here
// does a default sitting beside named exports change what a consumer receives.
const AMBIGUOUS_LIBRARY_TYPES = new Set([
	"commonjs",
	"commonjs2",
	"commonjs-module",
	"commonjs-static"
]);

class MixedExportsPlugin {
	/**
	 * Creates an instance of MixedExportsPlugin.
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
				const { moduleGraph, outputOptions } = compilation;
				const library = outputOptions.library;
				const type = library && library.type;

				if (!type || !AMBIGUOUS_LIBRARY_TYPES.has(type)) return;

				// Naming one export already resolves it, whichever it is.
				if (library.export) return;

				/** @type {MixedExportsDetails[]} */
				const mixed = [];

				for (const [name, entry] of compilation.entries) {
					// One configured entry can name several modules, and the report is
					// about the entry, so they are gathered rather than pushed apart.
					/** @type {Set<string>} */
					const named = new Set();
					let hasDefault = false;

					for (const dependency of entry.dependencies) {
						const module = moduleGraph.getModule(dependency);

						if (!module) continue;

						const provided = moduleGraph
							.getExportsInfo(module)
							.getProvidedExports();

						// `true` means "everything", which says nothing about a default.
						if (!Array.isArray(provided)) continue;

						// The two can come from different modules of the same entry, so
						// each is looked for across all of them rather than per module.
						for (const it of provided) {
							if (it === "default") {
								hasDefault = true;
							} else {
								named.add(it);
							}
						}
					}

					if (!hasDefault || named.size === 0) continue;

					mixed.push({ name, named: [...named].sort(compareStrings) });
				}

				if (mixed.length === 0) return;

				// Entry order follows the config, but sort so a rename cannot reorder.
				mixed.sort((a, b) => compareStrings(a.name, b.name));

				const warning = new MixedExportsWarning(
					mixed.slice(0, MAX_REPORTED_ENTRIES),
					type
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

module.exports = MixedExportsPlugin;
