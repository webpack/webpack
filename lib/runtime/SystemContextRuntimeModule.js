/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";

class SystemContextRuntimeModule extends RuntimeModule {
	constructor() {
		super("__system_context__");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.systemContext} = __system_context__;`;
	}
}

export default SystemContextRuntimeModule;

export { SystemContextRuntimeModule as "module.exports" };
