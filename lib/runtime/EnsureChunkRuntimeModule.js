/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * Runtime module that implements `__webpack_require__.e`, delegating chunk
 * loading work to the registered ensure-chunk handlers.
 */
class EnsureChunkRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that emits the chunk-ensuring entry point.
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("ensure chunk");
		/** @type {ReadOnlyRuntimeRequirements} */
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Generates the runtime function that loads additional chunks or resolves
	 * immediately when all referenced chunks are already present.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		// Check if there are non initial chunks which need to be imported using require-ensure
		if (this.runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers)) {
			const withFetchPriority = this.runtimeRequirements.has(
				RuntimeGlobals.hasFetchPriority
			);
			const handlers = RuntimeGlobals.ensureChunkHandlers;
			return Template.asString([
				`${handlers} = {};`,
				"// This file contains only the entry chunk.",
				"// The chunk loading function for additional chunks",
				`${RuntimeGlobals.ensureChunk} = ${runtimeTemplate.basicFunction(
					`chunkId${withFetchPriority ? ", fetchPriority" : ""}`,
					[
						`return Promise.all(Object.keys(${handlers}).reduce(${runtimeTemplate.basicFunction(
							"promises, key",
							[
								`${handlers}[key](chunkId, promises${
									withFetchPriority ? ", fetchPriority" : ""
								});`,
								"return promises;"
							]
						)}, []));`
					]
				)};`
			]);
		}
		// There ensureChunk is used somewhere in the tree, so we need an empty requireEnsure
		// function. This can happen with multiple entrypoints.
		return Template.asString([
			"// The chunk loading function for additional chunks",
			"// Since all referenced chunks are already included",
			"// in this file, this function is empty here.",
			`${RuntimeGlobals.ensureChunk} = ${runtimeTemplate.returningFunction(
				"Promise.resolve()"
			)};`
		]);
	}
}

module.exports = EnsureChunkRuntimeModule;
