/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class RuntimeIdRuntimeModule extends RuntimeModule {
	constructor() {
		super("runtimeId");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunkGraph, chunk } = this;
		const runtime = chunk.runtime;
		if (typeof runtime !== "string")
			throw new Error("RuntimeIdRuntimeModule must be in a single runtime");
		const id = chunkGraph.getRuntimeId(runtime);
		return `${RuntimeGlobals.runtimeId} = ${JSON.stringify(id)};`;
	}
}

module.exports = RuntimeIdRuntimeModule;
