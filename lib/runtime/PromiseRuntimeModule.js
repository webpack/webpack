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
		const { runtimeTemplate } = this.compilation;
		if (runtimeTemplate.supportsPromise()) {
			return `${RuntimeGlobals.promise} = Promise;`;
		} else {
			return `${RuntimeGlobals.promise} = undefined;`;
		}
	}
}

module.exports = PromiseRuntimeModule;
