/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NormalModule = require("../NormalModule");
const MissingSideEffectsWarning = require("../errors/MissingSideEffectsWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");
const hasOnlyUnusedExports = require("./hasOnlyUnusedExports");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/**
 * @import {
 * 	MissingSideEffectsDetails
 * } from "../errors/MissingSideEffectsWarning"
 */

const PLUGIN_NAME = "MissingSideEffectsPlugin";

// Enough to name the costliest without listing the whole dependency tree.
const MAX_REPORTED_PACKAGES = 5;

/**
 * The package a module belongs to, when its package.json leaves 'sideEffects'
 * unsaid. Nearly every package does, so only the costly ones are worth naming.
 * @param {Module} module the module to look up
 * @returns {string | undefined} the package name, or undefined
 */
const getUndeclaredPackage = (module) => {
	if (!(module instanceof NormalModule)) return undefined;

	const resolveData = module.resourceResolveData;
	const description = resolveData && resolveData.descriptionFileData;

	if (!description || typeof description.name !== "string") return undefined;
	if ("sideEffects" in description) return undefined;

	return description.name;
};

class MissingSideEffectsPlugin {
	/**
	 * Creates an instance of MissingSideEffectsPlugin.
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
			/** @type {MissingSideEffectsWarning | undefined} */
			let warning;

			// Usage is final here, and concatenation has not merged the modules
			// away yet, so each one can still be measured and attributed.
			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { chunkGraph, moduleGraph } = compilation;
				/** @type {Map<string, { modules: number, size: number }>} */
				const byPackage = new Map();
				let wasted = 0;

				for (const module of modules) {
					// One webpack already left out costs nothing.
					if (chunkGraph.getNumberOfModuleChunks(module) === 0) continue;
					if (!hasOnlyUnusedExports(module, moduleGraph, chunkGraph)) continue;

					const name = getUndeclaredPackage(module);

					if (name === undefined) continue;

					const size = getModuleSize(module);
					const entry = byPackage.get(name);

					wasted += size;

					if (entry === undefined) {
						byPackage.set(name, { modules: 1, size });
					} else {
						entry.modules++;
						entry.size += size;
					}
				}

				if (byPackage.size === 0) return;

				/** @type {MissingSideEffectsDetails[]} */
				const packages = [];

				for (const [name, { modules: count, size }] of byPackage) {
					packages.push({ name, modules: count, size });
				}

				// Ties break by name: module order is not stable across runtimes.
				packages.sort(
					(a, b) => b.size - a.size || compareStrings(a.name, b.name)
				);

				warning = new MissingSideEffectsWarning(
					packages.slice(0, MAX_REPORTED_PACKAGES),
					packages.length,
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

module.exports = MissingSideEffectsPlugin;
