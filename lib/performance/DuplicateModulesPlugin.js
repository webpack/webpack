/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const DuplicateModulesWarning = require("../errors/DuplicateModulesWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const getSourceModules = require("./getSourceModules");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import { DuplicateModuleDetails } from "../errors/DuplicateModulesWarning" */

const PLUGIN_NAME = "DuplicateModulesPlugin";

// Enough to name the costliest without listing every shared module.
const MAX_REPORTED_MODULES = 5;

class DuplicateModulesPlugin {
	/**
	 * Creates an instance of DuplicateModulesPlugin.
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

				// The entrypoints a chunk is reached from, so a copy can be blamed on
				// the pages that pay for it.
				/** @type {Map<Chunk, Set<string>>} */
				const chunkEntrypoints = new Map();

				for (const [name, entrypoint] of entrypoints) {
					for (const chunk of entrypoint.chunks) {
						const names = chunkEntrypoints.get(chunk);

						if (names === undefined) {
							chunkEntrypoints.set(chunk, new Set([name]));
						} else {
							names.add(name);
						}
					}
				}

				/** @type {Map<Module, { chunks: Set<Chunk>, entrypoints: Set<string> }>} */
				const copies = new Map();

				for (const chunk of compilation.chunks) {
					const names = chunkEntrypoints.get(chunk);

					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						// Scope hoisting makes several modules into one, so a module
						// concatenated into two chunks is in neither on its own.
						for (const inner of getSourceModules(module)) {
							let entry = copies.get(inner);

							if (entry === undefined) {
								copies.set(
									inner,
									(entry = { chunks: new Set(), entrypoints: new Set() })
								);
							}

							entry.chunks.add(chunk);

							if (names !== undefined) {
								for (const name of names) entry.entrypoints.add(name);
							}
						}
					}
				}

				/** @type {DuplicateModuleDetails[]} */
				const duplicated = [];
				let wasted = 0;

				for (const [module, { chunks, entrypoints: names }] of copies) {
					if (chunks.size < 2) continue;

					// The first copy is the one that had to be emitted; the rest are
					// what a shared chunk would save.
					const extra = getModuleSize(module) * (chunks.size - 1);

					wasted += extra;
					duplicated.push({
						name: module.readableIdentifier(requestShortener),
						chunks: chunks.size,
						entrypoints: [...names].sort(compareStrings),
						wasted: extra
					});
				}

				if (duplicated.length === 0) return;

				// Ties break by name: which modules finish first is not stable.
				duplicated.sort(
					(a, b) => b.wasted - a.wasted || compareStrings(a.name, b.name)
				);

				const warning = new DuplicateModulesWarning(
					duplicated.slice(0, MAX_REPORTED_MODULES),
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

module.exports = DuplicateModulesPlugin;
