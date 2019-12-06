/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../NormalModule")} NormalModule */

/** @type {WeakMap<NormalModule, boolean>} */
const moduleExportsState = new WeakMap();

/**
 * @param {NormalModule} module the module
 * @param {boolean} isStrictHarmony strict harmony mode should be enabled
 * @returns {void}
 */
exports.enable = (module, isStrictHarmony) => {
	const value = moduleExportsState.get(module);
	if (value === false) return;
	moduleExportsState.set(module, true);
	if (value !== true) {
		module.buildMeta.exportsType = "namespace";
		module.buildInfo.strict = true;
		module.buildInfo.exportsArgument = "__webpack_exports__";
		if (isStrictHarmony) {
			module.buildMeta.strictHarmonyModule = true;
			module.buildInfo.moduleArgument = "__webpack_module__";
		}
	}
};

/**
 * @param {NormalModule} module the module
 * @returns {boolean} true, when enabled
 */
exports.isEnabled = module => {
	const value = moduleExportsState.get(module);
	return value === true;
};
