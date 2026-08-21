/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const DuplicateModulesWarning = require("../errors/DuplicateModulesWarning");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/**
 * @import {
 * 	DuplicateModuleDetails
 * } from "../errors/DuplicateModulesWarning"
 */

const PLUGIN_NAME = "DuplicateModulesPlugin";

// Enough to name the offenders without printing the module graph.
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
				const { chunkGraph, requestShortener } = compilation;
				/** @type {DuplicateModuleDetails[]} */
				const duplicated = [];
				let wasted = 0;

				for (const module of compilation.modules) {
					const chunks = chunkGraph.getNumberOfModuleChunks(module);

					if (chunks < 2) continue;

					// The first copy is the one that had to be emitted; the rest are
					// what a shared chunk would save.
					const extra = getModuleSize(module) * (chunks - 1);

					wasted += extra;
					duplicated.push({
						name: module.readableIdentifier(requestShortener),
						chunks,
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
