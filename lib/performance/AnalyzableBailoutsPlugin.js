/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const AnalyzableBailoutsWarning = require("../errors/AnalyzableBailoutsWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import { BailoutDetails } from "../errors/AnalyzableBailoutsWarning" */

const PLUGIN_NAME = "AnalyzableBailoutsPlugin";

// Enough to point at the offenders without listing every module of a build.
const MAX_REPORTED_MODULES = 5;

class AnalyzableBailoutsPlugin {
	/**
	 * Creates an instance of AnalyzableBailoutsPlugin.
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
			// `afterSeal` is past the hash, which folds every message into it — and
			// past the runtime modules, which record their reasons while being hashed.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph, runtimeTemplate, requestShortener } = compilation;

				// Nothing is recorded outside ESM output, so there is nothing to walk.
				if (!runtimeTemplate.isModule()) return;

				/** @type {Map<string, Set<string>>} */
				const modulesByReason = new Map();

				/**
				 * Files the reasons recorded on a module under its printed name.
				 * @param {Module} module the module, a runtime module included
				 * @returns {void}
				 */
				const collect = (module) => {
					const reasons = runtimeTemplate.analyzableBailoutsOf(module);
					if (reasons.length === 0) return;
					const name = module.readableIdentifier(requestShortener);
					for (const reason of reasons) {
						let modules = modulesByReason.get(reason);
						if (modules === undefined) {
							modules = new Set();
							modulesByReason.set(reason, modules);
						}
						modules.add(name);
					}
				};

				for (const module of compilation.modules) collect(module);
				for (const chunk of compilation.chunks) {
					for (const module of chunkGraph.getChunkRuntimeModulesIterable(
						chunk
					)) {
						collect(module);
					}
				}

				if (modulesByReason.size === 0) return;

				/** @type {BailoutDetails[]} */
				const bailouts = [];
				let references = 0;

				for (const [reason, modules] of modulesByReason) {
					const names = [...modules].sort();
					references += names.length;
					bailouts.push({
						reason,
						modules: names.slice(0, MAX_REPORTED_MODULES),
						count: names.length
					});
				}

				// The reason holding the most modules leads; ties read in one order.
				bailouts.sort(
					(a, b) => b.count - a.count || (a.reason < b.reason ? -1 : 1)
				);

				const warning = new AnalyzableBailoutsWarning(bailouts, references);

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

module.exports = AnalyzableBailoutsPlugin;
