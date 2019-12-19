/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class ChunkPrefetchStartupRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} childType TODO
	 * @param {string} runtimeFunction TODO
	 * @param {(string|number)[]} startupChunks chunk ids to trigger after startup
	 */
	constructor(childType, runtimeFunction, startupChunks) {
		super(`startup ${childType}`, 5);
		this.childType = childType;
		this.runtimeFunction = runtimeFunction;
		this.startupChunks = startupChunks;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeFunction, startupChunks } = this;
		const { runtimeTemplate } = this.compilation;
		return Template.asString([
			`var startup = ${RuntimeGlobals.startup};`,
			`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction("", [
				"var result = startup();",
				Template.asString(
					startupChunks.length < 3
						? startupChunks.map(
								c => `${runtimeFunction}(${JSON.stringify(c)});`
						  )
						: `${JSON.stringify(startupChunks)}.map(${runtimeFunction});`
				),
				"return result;"
			])};`
		]);
	}
}

module.exports = ChunkPrefetchStartupRuntimeModule;
