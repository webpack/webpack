/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Runtime module that initializes the script nonce slot used when creating
 * script tags.
 */
class NonceRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that exposes `__webpack_require__.nc`.
	 */
	constructor() {
		super("nonce", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * /**
	 * Generates the default nonce initialization used by the rest of the
	 * runtime.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.scriptNonce} = undefined;`;
	}
}

module.exports = NonceRuntimeModule;
