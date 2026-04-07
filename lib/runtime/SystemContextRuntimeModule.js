/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Runtime module that forwards the ambient SystemJS execution context to
 * modules that rely on `__system_context__`.
 */
class SystemContextRuntimeModule extends RuntimeModule {
	/**
	 * Initializes the runtime assignment for `RuntimeGlobals.systemContext`.
	 */
	constructor() {
		super("__system_context__");
	}

	/**
	 * Generates the bootstrap statement that exposes the current
	 * `__system_context__` value through the webpack runtime globals object.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.systemContext} = __system_context__;`;
	}
}

module.exports = SystemContextRuntimeModule;
