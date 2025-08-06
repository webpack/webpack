/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

// CompatibilityPlugin renames `__webpack_require__` but doesn’t account for `export { __webpack_require__ }`, so we create a temporary variable to handle it.
const EXPORT_TEMP_NAME = "__webpack_require_temp__";

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
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`var ${EXPORT_TEMP_NAME} = ${RuntimeGlobals.require};`,
			`export { ${EXPORT_TEMP_NAME} as ${RuntimeGlobals.require} };`
		]);
	}
}

module.exports = ExportWebpackRequireRuntimeModule;
