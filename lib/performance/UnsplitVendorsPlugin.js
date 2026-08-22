/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UnsplitVendorsWarning = require("../errors/UnsplitVendorsWarning");
const { compareStrings } = require("../util/comparators");
const { NODE_MODULES_REGEXP } = require("../util/identifier");
const getModuleSize = require("./getModuleSize");
const getSourceModules = require("./getSourceModules");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/**
 * @import {
 * 	UnsplitVendorChunkDetails
 * } from "../errors/UnsplitVendorsWarning"
 */

const PLUGIN_NAME = "UnsplitVendorsPlugin";

// Enough to name the offenders without printing the chunk graph.
const MAX_REPORTED_CHUNKS = 5;

class UnsplitVendorsPlugin {
	/**
	 * Creates an instance of UnsplitVendorsPlugin.
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
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph } = compilation;
				/** @type {UnsplitVendorChunkDetails[]} */
				const mixed = [];

				for (const chunk of compilation.chunks) {
					// Only an initial chunk is downloaded on every visit, so only there
					// does mixing cost a returning visitor anything.
					if (!chunk.canBeInitial()) continue;

					let vendorModules = 0;
					let vendorSize = 0;
					let applicationModules = 0;

					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						for (const inner of getSourceModules(module)) {
							const resource = inner.nameForCondition();

							// A module with no resource is webpack's own (a runtime module),
							// which belongs to neither side and must not force a report.
							if (!resource) continue;

							if (NODE_MODULES_REGEXP.test(resource)) {
								vendorModules++;
								vendorSize += getModuleSize(inner);
							} else {
								applicationModules++;
							}
						}
					}

					if (vendorModules === 0 || applicationModules === 0) continue;

					mixed.push({
						name: chunk.name || `${chunk.id}`,
						vendorModules,
						vendorSize
					});
				}

				if (mixed.length === 0) return;

				// Ties break by name: chunk iteration order is not stable.
				mixed.sort(
					(a, b) =>
						b.vendorSize - a.vendorSize || compareStrings(a.name, b.name)
				);

				const warning = new UnsplitVendorsWarning(
					mixed.slice(0, MAX_REPORTED_CHUNKS)
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

module.exports = UnsplitVendorsPlugin;
