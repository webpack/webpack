/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class BaseUriRuntimeModule extends RuntimeModule {
	constructor() {
		super("base uri", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk } = this;

		const options = chunk.getEntryOptions();
		return `${RuntimeGlobals.baseURI} = ${
			options.baseUri === undefined
				? "undefined"
				: JSON.stringify(options.baseUri)
		};`;
	}
}

module.exports = BaseUriRuntimeModule;
