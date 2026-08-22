/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const DuplicatePackagesWarning = require("./DuplicatePackagesWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import NormalModule from "../NormalModule" */

/**
 * One copy of a package, identified by the directory its description file
 * (usually `package.json`) lives in.
 * @typedef {object} PackageCopy
 * @property {string} version version of this copy
 * @property {string} path directory of this copy
 * @property {Module[]} modules modules included from this copy
 */

const PLUGIN_NAME = "DuplicatePackagesPlugin";

class DuplicatePackagesPlugin {
	/**
	 * Creates an instance of DuplicatePackagesPlugin.
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

		// `thisCompilation` keeps the hint to the root build, as child
		// compilations report the copies of their parent a second time
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			/** @type {DuplicatePackagesWarning[]} */
			const warnings = [];

			compilation.hooks.seal.tap(PLUGIN_NAME, () => {
				/** @type {Map<string, Map<string, PackageCopy>>} */
				const packages = new Map();
				for (const module of compilation.modules) {
					const resolveData =
						/** @type {NormalModule} */
						(module).resourceResolveData;
					if (resolveData === undefined) continue;
					const { descriptionFileData, descriptionFileRoot } = resolveData;
					if (descriptionFileData === undefined) continue;
					const { name, version } = descriptionFileData;
					// Only a named and versioned package can be compared with another copy
					if (
						typeof name !== "string" ||
						typeof version !== "string" ||
						descriptionFileRoot === undefined
					) {
						continue;
					}
					let copies = packages.get(name);
					if (copies === undefined) {
						copies = new Map();
						packages.set(name, copies);
					}
					const copy = copies.get(descriptionFileRoot);
					if (copy === undefined) {
						copies.set(descriptionFileRoot, {
							version,
							path: descriptionFileRoot,
							modules: [module]
						});
					} else {
						copy.modules.push(module);
					}
				}
				for (const name of [...packages.keys()].sort()) {
					const copies = /** @type {Map<string, PackageCopy>} */ (
						packages.get(name)
					);
					if (copies.size < 2) continue;
					const warning = new DuplicatePackagesWarning(
						name,
						[...copies.values()].sort((a, b) => (a.path < b.path ? -1 : 1)),
						compilation.moduleGraph,
						compilation.requestShortener
					);
					warnings.push(warning);
				}
			});

			// Reported past the hash: `createHash` folds every message into it, so
			// a hint pushed earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				for (const warning of warnings) {
					if (hints === "error") {
						compilation.errors.push(warning);
					} else if (hints === "stats") {
						compilation.hints.push(warning);
					} else {
						compilation.warnings.push(warning);
					}
				}
			});
		});
	}
}

module.exports = DuplicatePackagesPlugin;
