/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const EntrypointOverlapWarning = require("../errors/EntrypointOverlapWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const getSourceModules = require("./getSourceModules");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/**
 * @import {
 * 	EntrypointOverlapDetails
 * } from "../errors/EntrypointOverlapWarning"
 */

const PLUGIN_NAME = "EntrypointOverlapPlugin";

// Enough to name the offenders without printing the module graph.
const MAX_REPORTED_MODULES = 5;

class EntrypointOverlapPlugin {
	/**
	 * Creates an instance of EntrypointOverlapPlugin.
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
				const { chunkGraph, entrypoints, requestShortener } = compilation;

				if (entrypoints.size < 2) return;

				/** @type {Map<Module, { chunks: Set<Chunk>, entrypoints: Set<string> }>} */
				const reach = new Map();

				for (const [name, entrypoint] of entrypoints) {
					for (const chunk of entrypoint.chunks) {
						for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
							// Through scope hoisting: two entrypoints concatenating the same
							// file produce two modules, so the chunk graph alone shows none.
							for (const inner of getSourceModules(module)) {
								let entry = reach.get(inner);

								if (entry === undefined) {
									reach.set(
										inner,
										(entry = { chunks: new Set(), entrypoints: new Set() })
									);
								}

								entry.chunks.add(chunk);
								entry.entrypoints.add(name);
							}
						}
					}
				}

				/** @type {EntrypointOverlapDetails[]} */
				const overlapping = [];
				let wasted = 0;

				for (const [module, { chunks, entrypoints: names }] of reach) {
					// One chunk reached from several entrypoints is downloaded once, so
					// only separate copies cost anything.
					if (chunks.size < 2 || names.size < 2) continue;

					const extra = getModuleSize(module) * (chunks.size - 1);

					wasted += extra;
					overlapping.push({
						name: module.readableIdentifier(requestShortener),
						entrypoints: [...names].sort(compareStrings),
						wasted: extra
					});
				}

				if (overlapping.length === 0) return;

				// Ties break by name: which modules finish first is not stable.
				overlapping.sort(
					(a, b) => b.wasted - a.wasted || compareStrings(a.name, b.name)
				);

				const warning = new EntrypointOverlapWarning(
					overlapping.slice(0, MAX_REPORTED_MODULES),
					wasted
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

module.exports = EntrypointOverlapPlugin;
