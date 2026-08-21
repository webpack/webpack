/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Compilation from "../Compilation" */
/** @import { ReadOnlyRuntimeRequirements } from "../Module" */

class EnsureChunkRuntimeModule extends RuntimeModule {
	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

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
		// An analyzable `import()` dispatches the handlers itself, so a build can need the
		// map without the function around it.
		const withEnsureChunk = this.runtimeRequirements.has(
			RuntimeGlobals.ensureChunk
		);
		// Check if there are non initial chunks which need to be imported using require-ensure
		if (this.runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers)) {
			const withFetchPriority = this.runtimeRequirements.has(
				RuntimeGlobals.hasFetchPriority
			);
			const handlers = RuntimeGlobals.ensureChunkHandlers;
			if (!withEnsureChunk) return `${handlers} = {};`;
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
