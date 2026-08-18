/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const UnusedReexportsWarning = require("../errors/UnusedReexportsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../errors/UnusedReexportsWarning").UnusedReexportDetails} UnusedReexportDetails */

const PLUGIN_NAME = "UnusedReexportsPlugin";

// Enough to name the offenders without listing the barrel.
const MAX_REPORTED_MODULES = 5;

/**
 * Tells whether every module pulling this one in does so by re-exporting it.
 * One an importer wants for its side effects alone is deliberate, not a
 * barrel's leftover.
 * @param {Module} module the module to look up
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true when only re-exports pull it in
 */
const isOnlyReexported = (module, moduleGraph) => {
	// `export *` carries a side-effect edge of its own, so an importer is judged
	// by all of its edges rather than each edge on its own.
	/** @type {Map<Module, boolean>} */
	const reexportedBy = new Map();

	for (const connection of moduleGraph.getIncomingConnections(module)) {
		const origin = connection.originModule;

		// An entry has no origin: it is in the build because it was asked for.
		if (!origin) return false;

		if (
			connection.dependency instanceof HarmonyExportImportedSpecifierDependency
		) {
			reexportedBy.set(origin, true);
		} else if (!reexportedBy.has(origin)) {
			reexportedBy.set(origin, false);
		}
	}

	if (reexportedBy.size === 0) return false;

	for (const reexported of reexportedBy.values()) {
		if (!reexported) return false;
	}

	return true;
};

class UnusedReexportsPlugin {
	/**
	 * Creates an instance of UnusedReexportsPlugin.
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
			// Usage is final here, and concatenation has not merged the modules
			// away yet, so each one can still be named and measured.
			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { chunkGraph, moduleGraph, requestShortener } = compilation;
				/** @type {UnusedReexportDetails[]} */
				const unused = [];
				let wasted = 0;

				for (const module of modules) {
					// One webpack already left out costs nothing.
					if (chunkGraph.getNumberOfModuleChunks(module) === 0) continue;

					const exportsInfo = moduleGraph.getExportsInfo(module);
					const runtimes = [...chunkGraph.getModuleRuntimes(module)];
					let provided = 0;
					let allUnused = true;

					for (const exportInfo of exportsInfo.exports) {
						if (!exportInfo.provided) continue;

						provided++;

						for (const runtime of runtimes) {
							// `NoInfo` included: unknown usage is not unused.
							if (exportInfo.getUsed(runtime) !== UsageState.Unused) {
								allUnused = false;
								break;
							}
						}

						if (!allUnused) break;
					}

					// A module exporting nothing is there for its side effects, which is
					// not the same mistake.
					if (provided === 0 || !allUnused) continue;

					if (!isOnlyReexported(module, moduleGraph)) continue;

					const size = getModuleSize(module);

					wasted += size;
					unused.push({
						name: module.readableIdentifier(requestShortener),
						size
					});
				}

				if (unused.length === 0) return;

				// Ties break by name: module order is not stable across runtimes.
				unused.sort(
					(a, b) => b.size - a.size || compareStrings(a.name, b.name)
				);

				const warning = new UnusedReexportsWarning(
					unused.slice(0, MAX_REPORTED_MODULES),
					unused.length,
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

module.exports = UnusedReexportsPlugin;
