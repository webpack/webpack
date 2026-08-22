/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const UnusedReexportsWarning = require("../errors/UnusedReexportsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const hasOnlyUnusedExports = require("./hasOnlyUnusedExports");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { UnusedReexportDetails } from "../errors/UnusedReexportsWarning" */

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
	// A re-export emits a side-effect edge of its own, so edges are grouped by
	// the statement they come from — `sourceOrder` — rather than by their type.
	/** @type {Map<Module, Set<number | undefined>>} */
	const reexportedStatements = new Map();
	/** @type {[Module, number | undefined][]} */
	const edges = [];

	for (const connection of moduleGraph.getIncomingConnections(module)) {
		const origin = connection.originModule;

		// An entry has no origin: it is in the build because it was asked for.
		if (!origin) return false;

		const dependency = connection.dependency;

		// Only an ESM import statement can carry a re-export.
		if (!(dependency instanceof HarmonyImportDependency)) return false;

		if (dependency instanceof HarmonyExportImportedSpecifierDependency) {
			const statements = reexportedStatements.get(origin);

			if (statements === undefined) {
				reexportedStatements.set(origin, new Set([dependency.sourceOrder]));
			} else {
				statements.add(dependency.sourceOrder);
			}
		}

		edges.push([origin, dependency.sourceOrder]);
	}

	if (edges.length === 0) return false;

	for (const [origin, sourceOrder] of edges) {
		const statements = reexportedStatements.get(origin);

		if (statements === undefined || !statements.has(sourceOrder)) return false;
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
			/** @type {UnusedReexportsWarning | undefined} */
			let warning;

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

					if (!hasOnlyUnusedExports(module, moduleGraph, chunkGraph)) {
						continue;
					}

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

				warning = new UnusedReexportsWarning(
					unused.slice(0, MAX_REPORTED_MODULES),
					unused.length,
					wasted
				);
			});

			// Reported past the hash: `createHash` folds every message into it, so
			// a hint pushed earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				if (warning === undefined) return;

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
