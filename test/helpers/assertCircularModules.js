"use strict";

const path = require("path");

// Asserts buildInfo.isCircular (set by CircularModulesPlugin in production mode)
// matches the expected set of basename. Reads after optimizeModules, before
// concatenation, so original NormalModules are still present.
module.exports = (expectedCircular) =>
	function assertCircularModulesPlugin(compiler) {
		const expected = [...expectedCircular].sort();
		compiler.hooks.compilation.tap("assertCircularModules", (compilation) => {
			compilation.hooks.afterOptimizeModules.tap(
				"assertCircularModules",
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
