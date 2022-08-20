/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");

class ExportWebpackRequireRuntimeModule extends RuntimeModule {
	constructor() {
		super("export webpack runtime", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return "export default __webpack_require__;";
	}
}

module.exports = ExportWebpackRequireRuntimeModule;
