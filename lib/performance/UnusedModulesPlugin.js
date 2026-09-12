/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const HarmonyImportBareSideEffectDependency = require("../dependencies/HarmonyImportBareSideEffectDependency");
const UnusedModulesWarning = require("../errors/UnusedModulesWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const hasOnlyUnusedExports = require("./hasOnlyUnusedExports");
const isOnlyReexported = require("./isOnlyReexported");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { BuildInfo } from "../Module" */
/** @import { UnusedModuleDetails } from "../errors/UnusedModulesWarning" */

const PLUGIN_NAME = "UnusedModulesPlugin";

// Enough to name the offenders without listing every module kept this way.
const MAX_REPORTED_MODULES = 5;

/**
 * Whether some importer bound a name from this module. A bare `import "..."`
 * binds nothing, so it can only have been written for what importing does —
 * that is deliberate, and not what this hint is about.
 * @param {Module} module the module to look up
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true when every importer bound something
 */
const everyImportBinds = (module, moduleGraph) => {
	for (const connection of moduleGraph.getIncomingConnections(module)) {
		if (
			connection.dependency instanceof HarmonyImportBareSideEffectDependency
		) {
			return false;
		}
	}

	return true;
};

class UnusedModulesPlugin {
	/**
	 * Creates an instance of UnusedModulesPlugin.
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
			/** @type {UnusedModulesWarning | undefined} */
			let warning;

			// Usage is final here, and concatenation has not merged the modules
			// away yet, so each one can still be measured and attributed.
			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { chunkGraph, moduleGraph, requestShortener } = compilation;
				/** @type {UnusedModuleDetails[]} */
				const found = [];
				let size = 0;

				for (const module of modules) {
					// One webpack already left out costs nothing — and with no chunk it
					// has no runtime, which is all `hasOnlyUnusedExports` reads usage in.
					if (chunkGraph.getNumberOfModuleChunks(module) === 0) continue;
					if (!hasOnlyUnusedExports(module, moduleGraph, chunkGraph)) continue;

					// A barrel's leftover is the same finding with a different cause,
					// and `UnusedReexportsPlugin` states it with the re-export named.
					if (isOnlyReexported(module, moduleGraph)) continue;

					if (!everyImportBinds(module, moduleGraph)) continue;

					// Recorded while parsing, so a cache-restored build still has it.
					// Absent means the module is kept for a reason this hint cannot name.
					const statement =
						/** @type {BuildInfo} */
						(module.buildInfo).sideEffectStatement;

					if (statement === undefined) continue;

					const bytes = Math.round(getModuleSize(module));

					size += bytes;
					found.push({
						name: module.readableIdentifier(requestShortener),
						size: bytes,
						statement
					});
				}

				if (found.length === 0) return;

				// Largest first; ties break by name, module order is not stable.
				found.sort((a, b) => b.size - a.size || compareStrings(a.name, b.name));

				warning = new UnusedModulesWarning(
					found.slice(0, MAX_REPORTED_MODULES),
					found.length,
					size
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

module.exports = UnusedModulesPlugin;
