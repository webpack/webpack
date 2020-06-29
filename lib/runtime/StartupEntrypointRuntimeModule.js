/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../MainTemplate")} MainTemplate */

class StartupEntrypointRuntimeModule extends RuntimeModule {
	constructor(asyncChunkLoading) {
		super("startup entrypoint");
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate } = compilation;
		return `${
			RuntimeGlobals.startupEntrypoint
		} = ${runtimeTemplate.basicFunction(
			"chunkIds, moduleId",
			this.asyncChunkLoading
				? `return Promise.all(chunkIds.map(${
						RuntimeGlobals.ensureChunk
				  }, __webpack_require__)).then(${runtimeTemplate.returningFunction(
						"__webpack_require__(moduleId)"
				  )})`
				: [
						`chunkIds.map(${RuntimeGlobals.ensureChunk}, __webpack_require__)`,
						"return __webpack_require__(moduleId)"
				  ]
		)}`;
	}
}

module.exports = StartupEntrypointRuntimeModule;
