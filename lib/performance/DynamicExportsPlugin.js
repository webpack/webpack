/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const DynamicExportsWarning = require("../errors/DynamicExportsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { DynamicExportsDetails } from "../errors/DynamicExportsWarning" */

/**
 * Tells whether another module imports this one.
 * @param {Module} module the module to look up
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true when at least one module imports it
 */
const hasImporter = (module, moduleGraph) => {
	for (const connection of moduleGraph.getIncomingConnections(module)) {
		if (connection.originModule) return true;
	}

	return false;
};

const PLUGIN_NAME = "DynamicExportsPlugin";

// Enough to name the offenders without listing every CommonJS dependency.
const MAX_REPORTED_MODULES = 5;

class DynamicExportsPlugin {
	/**
	 * Creates an instance of DynamicExportsPlugin.
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
			/** @type {DynamicExportsWarning | undefined} */
			let warning;

			// Exports are settled here, and concatenation has not merged the
			// modules away yet, so each one can still be named and measured.
			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { chunkGraph, moduleGraph, requestShortener } = compilation;
				/** @type {DynamicExportsDetails[]} */
				const unknown = [];

				for (const module of modules) {
					// One webpack already left out costs nothing.
					if (chunkGraph.getNumberOfModuleChunks(module) === 0) continue;

					// `null` is the third state: not "no other exports" but "there
					// may be more, and they cannot be read from the source".
					if (
						moduleGraph.getExportsInfo(module).otherExportsInfo.provided !==
						null
					) {
						continue;
					}

					// The cost lands on whoever imports it, so an entry pays nothing.
					if (!hasImporter(module, moduleGraph)) continue;

					unknown.push({
						name: module.readableIdentifier(requestShortener),
						size: getModuleSize(module)
					});
				}

				if (unknown.length === 0) return;

				// Ties break by name: module order is not stable across runtimes.
				unknown.sort(
					(a, b) => b.size - a.size || compareStrings(a.name, b.name)
				);

				warning = new DynamicExportsWarning(
					unknown.slice(0, MAX_REPORTED_MODULES),
					unknown.length
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

module.exports = DynamicExportsPlugin;
