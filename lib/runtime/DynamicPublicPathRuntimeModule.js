/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Used for cross origin workers support. Relies on global variables.
 */
class DynamicPublicPathRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.publicPath} = new URL(__webpack_public_path__, __webpack_base_uri__) + "";`;
	}
}

module.exports = DynamicPublicPathRuntimeModule;
