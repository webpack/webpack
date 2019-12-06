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
 * @returns {void}
 */
exports.bailout = module => {
	const value = moduleExportsState.get(module);
	moduleExportsState.set(module, false);
	if (value === true) {
		module.buildMeta.exportsType = undefined;
		module.buildMeta.defaultObject = false;
	}
};

/**
 * @param {NormalModule} module the module
 * @returns {void}
 */
exports.enable = module => {
	const value = moduleExportsState.get(module);
	if (value === false) return;
	moduleExportsState.set(module, true);
	if (value !== true) {
		module.buildMeta.exportsType = "default";
		module.buildMeta.defaultObject = "redirect";
	}
};

/**
 * @param {NormalModule} module the module
 * @returns {void}
 */
exports.setFlagged = module => {
	const value = moduleExportsState.get(module);
	if (value !== true) return;
	module.buildMeta.exportsType = "flagged";
};

/**
 * @param {NormalModule} module the module
 * @returns {boolean} true, when enabled
 */
exports.isEnabled = module => {
	const value = moduleExportsState.get(module);
	return value === true;
};
