/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Module.js").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

class EnsureChunkRuntimeModule extends RuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("ensure chunk");
		/** @type {ReadOnlyRuntimeRequirements} */
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Generates runtime code for this runtime module.
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

export default EnsureChunkRuntimeModule;

export { EnsureChunkRuntimeModule as "module.exports" };
