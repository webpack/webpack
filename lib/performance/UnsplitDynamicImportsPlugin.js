/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const UnsplitDynamicImportWarning = require("../errors/UnsplitDynamicImportWarning");
const formatLocation = require("../util/formatLocation");
const { intersectRuntime } = require("../util/runtime");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

const PLUGIN_NAME = "UnsplitDynamicImportsPlugin";

// Enough to name the offenders without printing every call site.
const MAX_REPORTED_IMPORTS = 5;

class UnsplitDynamicImportsPlugin {
	/**
	 * Creates an instance of UnsplitDynamicImportsPlugin.
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
				 * Tells whether the module the `import()` targets is already loaded up
				 * front for the runtime performing it. Another runtime holding it in an
				 * initial chunk is irrelevant — this one still gets its own chunk.
				 * @param {Module} target the dynamically imported module
				 * @param {Module} importer the module performing the `import()`
				 * @returns {boolean} true when the `import()` defers nothing
				 */
				const isAlreadyInitial = (target, importer) => {
					for (const runtime of chunkGraph.getModuleRuntimes(importer)) {
						for (const chunk of chunkGraph.getModuleChunksIterable(target)) {
							if (
								chunk.canBeInitial() &&
								intersectRuntime(chunk.runtime, runtime) !== undefined
							) {
								return true;
							}
						}
					}

					return false;
				};

				/**
				 * @param {DependenciesBlock} block the block to walk
				 * @param {Module} importer the module the block belongs to
				 * @returns {void}
				 */
				const walk = (block, importer) => {
					for (const nested of block.blocks) {
						if (nested instanceof AsyncDependenciesBlock) {
							for (const dependency of nested.dependencies) {
								const target = moduleGraph.getModule(dependency);

								if (!target || !isAlreadyInitial(target, importer)) continue;

								descriptions.push(
									`${importer.readableIdentifier(requestShortener)}${
										nested.loc ? ` ${formatLocation(nested.loc)}` : ""
									} imports ${target.readableIdentifier(requestShortener)}`
								);
							}
						}

						walk(nested, importer);
					}
				};

				for (const module of compilation.modules) walk(module, module);

				if (descriptions.length === 0) return;

				const warning = new UnsplitDynamicImportWarning(
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

module.exports = UnsplitDynamicImportsPlugin;
