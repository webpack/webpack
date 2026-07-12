/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";

class ExportWebpackRequireRuntimeModule extends RuntimeModule {
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
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `export { ${RuntimeGlobals.require} };`;
	}
}

export default ExportWebpackRequireRuntimeModule;

export { ExportWebpackRequireRuntimeModule as "module.exports" };
