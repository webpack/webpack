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
		} = ${runtimeTemplate.basicFunction("result, chunkIds, fn", [
			"// arguments: chunkIds, moduleId are deprecated",
			"var moduleId = chunkIds;",
			`if(!fn) chunkIds = result, fn = ${runtimeTemplate.returningFunction(
				`__webpack_require__(${RuntimeGlobals.entryModuleId} = moduleId)`
			)};`,
			...(this.asyncChunkLoading
				? [
						`return Promise.all(chunkIds.map(${
							RuntimeGlobals.ensureChunk
						}, __webpack_require__)).then(${runtimeTemplate.basicFunction("", [
							"var r = fn();",
							"return r === undefined ? result : r;"
						])})`
				  ]
				: [
						`chunkIds.map(${RuntimeGlobals.ensureChunk}, __webpack_require__)`,
						"var r = fn();",
						"return r === undefined ? result : r;"
				  ])
		])}`;
	}
}

module.exports = StartupEntrypointRuntimeModule;
