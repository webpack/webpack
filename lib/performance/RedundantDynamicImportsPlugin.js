/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RedundantDynamicImportWarning = require("../errors/RedundantDynamicImportWarning");
const { compareStrings } = require("../util/comparators");
const formatLocation = require("../util/formatLocation");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

const PLUGIN_NAME = "RedundantDynamicImportsPlugin";

// Enough to name the offenders without printing every call site.
const MAX_REPORTED_IMPORTS = 5;

class RedundantDynamicImportsPlugin {
	/**
	 * Creates an instance of RedundantDynamicImportsPlugin.
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
				const { chunkGraph, moduleGraph, requestShortener } = compilation;
				/** @type {string[]} */
				const descriptions = [];

				/**
				 * The chunks certain to be loaded when `chunk` runs: itself, plus what
				 * every entrypoint able to reach it brings. Entrypoints are alternative
				 * load paths, so they are intersected — one that carries the target says
				 * nothing about a page that loads another. A shared runtime name is not
				 * enough either: with `runtimeChunk: "single"` two entrypoints share one
				 * runtime while neither loads the other's initial chunks.
				 * @param {Chunk} chunk the chunk the importer runs in
				 * @returns {Set<Chunk>} the chunks loaded before it runs
				 */
				const getLoadedChunks = (chunk) => {
					const chunks = new Set([chunk]);
					/** @type {Set<ChunkGroup>} */
					const entrypoints = new Set();
					/** @type {Set<ChunkGroup>} */
					const queue = new Set(chunk.groupsIterable);

					for (const group of queue) {
						// Only initial chunks are certain: an async ancestor is loaded on
						// the path taken, and a group can be reached by several.
						if (group.isInitial()) {
							entrypoints.add(group);
							continue;
						}

						for (const parent of group.getParents()) queue.add(parent);
					}

					if (entrypoints.size === 0) return chunks;

					/** @type {Set<Chunk> | undefined} */
					let common;

					for (const entrypoint of entrypoints) {
						/** @type {Set<Chunk>} */
						const loaded = new Set();
						/** @type {Set<ChunkGroup>} */
						const chain = new Set([entrypoint]);

						// An entrypoint reached through `dependOn` is loaded first too, so
						// within one path they add up rather than cancel each other out.
						for (const group of chain) {
							for (const member of group.chunks) loaded.add(member);
							for (const parent of group.getParents()) chain.add(parent);
						}

						if (common === undefined) {
							common = loaded;
							continue;
						}

						for (const member of common) {
							if (!loaded.has(member)) common.delete(member);
						}
					}

					for (const member of /** @type {Set<Chunk>} */ (common)) {
						chunks.add(member);
					}

					return chunks;
				};

				/**
				 * @param {DependenciesBlock} block the block to walk
				 * @param {Module} importer the module the block belongs to
				 * @param {Set<Chunk>[]} contexts what is loaded in each place it runs
				 * @returns {void}
				 */
				const walk = (block, importer, contexts) => {
					for (const nested of block.blocks) {
						if (nested instanceof AsyncDependenciesBlock) {
							for (const dependency of nested.dependencies) {
								const target = moduleGraph.getModule(dependency);

								if (!target) continue;

								// Redundant only where it is redundant everywhere: a shared
								// importer still defers for an entry that lacks the target.
								let redundant = true;

								for (const loaded of contexts) {
									let present = false;

									for (const chunk of chunkGraph.getModuleChunksIterable(
										target
									)) {
										if (loaded.has(chunk)) {
											present = true;
											break;
										}
									}

									if (!present) {
										redundant = false;
										break;
									}
								}

								if (!redundant) continue;

								descriptions.push(
									`${importer.readableIdentifier(requestShortener)}${
										nested.loc ? ` ${formatLocation(nested.loc)}` : ""
									} imports ${target.readableIdentifier(requestShortener)}`
								);
							}
						}

						walk(nested, importer, contexts);
					}
				};

				for (const module of compilation.modules) {
					if (module.blocks.length === 0) continue;

					/** @type {Set<Chunk>[]} */
					const contexts = [];

					for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
						contexts.push(getLoadedChunks(chunk));
					}

					if (contexts.length === 0) continue;

					walk(module, module, contexts);
				}

				if (descriptions.length === 0) return;

				// Module order is not stable across runtimes, so the reported subset
				// would otherwise differ between them.
				descriptions.sort(compareStrings);

				const warning = new RedundantDynamicImportWarning(
					descriptions.slice(0, MAX_REPORTED_IMPORTS)
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

module.exports = RedundantDynamicImportsPlugin;
