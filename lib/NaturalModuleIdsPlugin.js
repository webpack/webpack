/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

/**
 * @param {Module} a first module to sort by
 * @param {Module} b second module to sort by
 * @returns {-1|0|1} sort value
 */
const byIndexOrIdentifier = (a, b) => {
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;
	const identA = a.identifier();
	const identB = b.identifier();
	if (identA < identB) return -1;
	if (identA > identB) return 1;
	return 0;
};

class NaturalModuleIdsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalModuleIdsPlugin", compilation => {
			compilation.hooks.optimizeModuleOrder.tap(
				"NaturalModuleIdsPlugin",
				modules => {
					modules.sort(byIndexOrIdentifier);
				}
			);
		});
	}
}

module.exports = NaturalModuleIdsPlugin;
