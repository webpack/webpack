/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { VALUE_DEP_PREFIX, getDeclaredKeys } = require("../DefinePlugin");
const UnusedDefinesWarning = require("../errors/UnusedDefinesWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { NormalModuleBuildInfo } from "../NormalModule" */

const PLUGIN_NAME = "UnusedDefinesPlugin";

class UnusedDefinesPlugin {
	/**
	 * Creates an instance of UnusedDefinesPlugin.
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

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const declared = getDeclaredKeys(compilation);

				if (declared === undefined || declared.size === 0) return;
				// Nothing was parsed, so no key could be substituted — an empty build is
				// not evidence that a key is unused.
				if (compilation.modules.size === 0) return;

				/** @type {Set<string>} */
				const used = new Set();

				for (const module of compilation.modules) {
					const buildInfo =
						/** @type {NormalModuleBuildInfo} */
						(module.buildInfo);

					if (!buildInfo || !buildInfo.valueDependencies) continue;

					// Survives the persistent cache: `valueDependencies` is serialized
					// with the module, so a restored module answers without rebuilding.
					for (const name of buildInfo.valueDependencies.keys()) {
						if (name.startsWith(VALUE_DEP_PREFIX)) {
							used.add(name.slice(VALUE_DEP_PREFIX.length));
						}
					}
				}

				const unused = [];

				for (const key of declared) {
					if (!used.has(key)) unused.push(key);
				}

				if (unused.length === 0) return;

				unused.sort();

				const warning = new UnusedDefinesWarning(unused);

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

module.exports = UnusedDefinesPlugin;
