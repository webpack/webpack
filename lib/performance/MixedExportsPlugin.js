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

				/** @type {Map<string, MixedExportsDetails[]>} */
				const byType = new Map();

				for (const [name, entry] of compilation.entries) {
					// An entry can carry its own library, which wins over the output one.
					const library = entry.options.library || outputOptions.library;
					const type = library && library.type;

					if (!type || !AMBIGUOUS_LIBRARY_TYPES.has(type)) continue;

					// Naming one export already resolves it, whichever it is.
					if (library.export) continue;

					// Only the last module of an entry reaches the consumer: every chunk
					// format renders the startup with `entries[entries.length - 1]`.
					const { dependencies } = entry;
					const exported = dependencies[dependencies.length - 1];

					if (!exported) continue;

					const module = moduleGraph.getModule(exported);

					if (!module) continue;

					const provided = moduleGraph
						.getExportsInfo(module)
						.getProvidedExports();

					// `true` means "everything", which says nothing about a default.
					if (!Array.isArray(provided)) continue;

					/** @type {string[]} */
					const named = [];
					let hasDefault = false;

					for (const it of provided) {
						if (it === "default") {
							hasDefault = true;
						} else {
							named.push(it);
						}
					}

					if (!hasDefault || named.length === 0) continue;

					const mixed = byType.get(type);
					const details = { name, named: named.sort(compareStrings) };

					if (mixed) {
						mixed.push(details);
					} else {
						byType.set(type, [details]);
					}
				}

				if (byType.size === 0) return;

				// One report per library type, sorted so a rename cannot reorder them.
				for (const type of [...byType.keys()].sort(compareStrings)) {
					const mixed = /** @type {MixedExportsDetails[]} */ (byType.get(type));

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
				}
			});
		});
	}
}

module.exports = MixedExportsPlugin;
