"use strict";

const path = require("node:path");

/** @typedef {import("../../").Compiler} Compiler */
/** @typedef {import("../../").Module} Module */

// Asserts buildInfo.isCircular (set by CircularModulesPlugin in production mode)
// matches the expected set of basename. Reads after optimizeModules, before
// concatenation, so original NormalModules are still present.
/**
 * @param {Iterable<string>} expectedCircular expected circular module basename
 * @returns {(compiler: Compiler) => void} plugin
 */
module.exports = (expectedCircular) =>
	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	function assertCircularModulesPlugin(compiler) {
		const expected = [...expectedCircular].sort();
		compiler.hooks.compilation.tap("assertCircularModules", (compilation) => {
			compilation.hooks.afterOptimizeModules.tap(
				"assertCircularModules",
				/**
				 * @param {Iterable<Module>} modules modules
				 * @returns {void}
				 */
				(modules) => {
					/** @type {string[]} */
					const actual = [];
					for (const module of modules) {
						const name = module.nameForCondition();
						if (!name) continue;
						if (module.buildInfo && module.buildInfo.isCircular) {
							actual.push(path.basename(name));
						}
					}
					expect(actual.sort()).toEqual(expected);
				}
			);
		});
	};
