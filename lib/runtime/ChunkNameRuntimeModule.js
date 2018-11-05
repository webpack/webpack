/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class ChunkNameRuntimeModule extends RuntimeModule {
	constructor(chunkName) {
		super("chunkName");
		this.chunkName = chunkName;
	}

	/**
	 * @param {TODO} generateContext context
	 * @returns {string} runtime code
	 */
	generate({ hash }) {
		return `${RuntimeGlobals.chunkName} = ${JSON.stringify(this.chunkName)};`;
	}
}

module.exports = ChunkNameRuntimeModule;
