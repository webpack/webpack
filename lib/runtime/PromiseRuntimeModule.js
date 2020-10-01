/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class PromiseRuntimeModule extends RuntimeModule {
	constructor() {
		super("Promise");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.promise} = typeof Promise !== "undefined" && Promise`;
	}
}

module.exports = PromiseRuntimeModule;
