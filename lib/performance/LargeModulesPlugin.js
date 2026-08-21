/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const LargeModulesWarning = require("../errors/LargeModulesWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const getSourceModules = require("./getSourceModules");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../errors/LargeModulesWarning").LargeModuleDetails} LargeModuleDetails */

const PLUGIN_NAME = "LargeModulesPlugin";

// Enough to name the offenders without listing the module graph.
const MAX_REPORTED_MODULES = 5;

// Half of a chunk in a single module is where the chunk really is that module.
// Below it the weight is spread around and there is nothing single to act on.
const DOMINANT_SHARE = 0.5;

// Scaled to the asset budget rather than fixed, so raising `maxAssetSize`
// raises what counts as big enough to be worth naming.
const MIN_SHARE_OF_ASSET_LIMIT = 0.2;

class LargeModulesPlugin {
	/**
	 * Creates an instance of LargeModulesPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
		/** @type {PerformanceOptions["maxAssetSize"]} */
		this.maxAssetSize = options.maxAssetSize;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		if (!hints) return;

		const minSize =
			/** @type {number} */ (this.maxAssetSize) * MIN_SHARE_OF_ASSET_LIMIT;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph, requestShortener } = compilation;
				/** @type {Map<Module, LargeModuleDetails>} */
				const worst = new Map();

				for (const chunk of compilation.chunks) {
					const chunkName = chunk.name || `${chunk.id}`;
					/** @type {Map<Module, number>} */
					const sizes = new Map();
					let chunkSize = 0;

					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						// Through scope hoisting one module stands for the several it
						// absorbed, and it is those the report has to name.
						for (const inner of getSourceModules(module)) {
							const size = getModuleSize(inner);

							sizes.set(inner, (sizes.get(inner) || 0) + size);
							chunkSize += size;
						}
					}

					for (const [module, size] of sizes) {
						if (size < minSize) continue;
						if (size < chunkSize * DOMINANT_SHARE) continue;

						const previous = worst.get(module);

						// A module weighs the same in every chunk holding it, so the one
						// named is the first by name — chunk order is not stable.
						if (previous && compareStrings(previous.chunk, chunkName) <= 0) {
							continue;
						}

						worst.set(module, {
							name: module.readableIdentifier(requestShortener),
							chunk: chunkName,
							size,
							chunkSize
						});
					}
				}

				if (worst.size === 0) return;

				const large = [...worst.values()];

				// Ties break by name: chunk iteration order is not stable.
				large.sort((a, b) => b.size - a.size || compareStrings(a.name, b.name));

				const warning = new LargeModulesWarning(
					large.slice(0, MAX_REPORTED_MODULES),
					large.length
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

module.exports = LargeModulesPlugin;
