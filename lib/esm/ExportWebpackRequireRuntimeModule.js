/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Runtime module that re-exports webpack's internal `require` function from an
 * ESM runtime entry.
 */
class ExportWebpackRequireRuntimeModule extends RuntimeModule {
	/**
	 * Initializes the ESM bridge that exposes the webpack runtime require.
	 */
	constructor() {
		super("export webpack runtime", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Generates the ESM export statement that makes the runtime `require`
	 * function available to external consumers.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `export { ${RuntimeGlobals.require} };`;
	}
}

module.exports = ExportWebpackRequireRuntimeModule;
