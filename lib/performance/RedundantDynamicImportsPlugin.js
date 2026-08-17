/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RedundantDynamicImportWarning = require("../errors/RedundantDynamicImportWarning");
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
				 * The chunks already loaded by the time a module runs: the initial
				 * chunks of every entrypoint that can reach it. A shared runtime name
				 * is not enough — with `runtimeChunk: "single"` two entrypoints share
				 * one runtime while neither loads the other's initial chunks.
				 * @param {Module} module the module to look up
				 * @returns {Set<Chunk>} the chunks loaded before it runs
				 */
				const getInitialChunks = (module) => {
					// Whatever chunk carries the module is loaded by the time it runs.
					const chunks = new Set(chunkGraph.getModuleChunksIterable(module));
					/** @type {Set<ChunkGroup>} */
					const queue = new Set();

					for (const chunk of chunks) {
						for (const group of chunk.groupsIterable) queue.add(group);
					}

					for (const group of queue) {
						// Only initial chunks are certain: an async ancestor is loaded on
						// the path taken, and a group can be reached by several.
						if (group.isInitial()) {
							for (const chunk of group.chunks) chunks.add(chunk);
						}

						// An entrypoint reached through `dependOn` is loaded first too.
						for (const parent of group.getParents()) queue.add(parent);
					}

					return chunks;
				};

				/**
				 * @param {DependenciesBlock} block the block to walk
				 * @param {Module} importer the module the block belongs to
				 * @param {Set<Chunk>} initialChunks what is loaded before `importer` runs
				 * @returns {void}
				 */
				const walk = (block, importer, initialChunks) => {
					for (const nested of block.blocks) {
						if (nested instanceof AsyncDependenciesBlock) {
							for (const dependency of nested.dependencies) {
								const target = moduleGraph.getModule(dependency);

								if (!target) continue;

								let deferred = true;

								for (const chunk of chunkGraph.getModuleChunksIterable(
									target
								)) {
									if (initialChunks.has(chunk)) {
										deferred = false;
										break;
									}
								}

								if (deferred) continue;

								descriptions.push(
									`${importer.readableIdentifier(requestShortener)}${
										nested.loc ? ` ${formatLocation(nested.loc)}` : ""
									} imports ${target.readableIdentifier(requestShortener)}`
								);
							}
						}

						walk(nested, importer, initialChunks);
					}
				};

				for (const module of compilation.modules) {
					if (module.blocks.length === 0) continue;

					walk(module, module, getInitialChunks(module));
				}

				if (descriptions.length === 0) return;

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
