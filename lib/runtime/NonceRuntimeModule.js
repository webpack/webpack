/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";

class NonceRuntimeModule extends RuntimeModule {
	constructor() {
		super("nonce", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.nonce} = undefined;`;
	}
}

export default NonceRuntimeModule;

export { NonceRuntimeModule as "module.exports" };
