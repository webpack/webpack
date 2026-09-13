/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const { propertyAccess } = require("../util/property");

/** @import Compilation from "../Compilation" */
/** @import { ReadOnlyRuntimeRequirements } from "../Module" */

// An assignment onto the handler map, as the modules installing one emit it. Reading
// what they emit keeps this from drifting as their conditions change.
const HANDLER_ASSIGNMENT = new RegExp(
	`${RuntimeGlobals.ensureChunkHandlers.replace(/[$.]/g, "\\$&")}\\.([\\w$]+)\\s*=`,
	"g"
);

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
	 * The one key the chunk's other runtime modules install on the handler map, or
	 * `null` when they install several — read from what they emit, so a handler added
	 * later is counted without being declared anywhere.
	 * @returns {string | null} the sole handler key, or `null`
	 */
	_onlyHandlerKey() {
		const { chunkGraph } = /** @type {Compilation} */ (this.compilation);
		const chunk = this.chunk;
		if (chunkGraph === undefined || chunk === undefined) return null;
		/** @type {string | null} */
		let only = null;
		for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
			if (module === this) continue;
			// Generating one that reads the compilation hash would cache it too early,
			// and one such module installs a handler, so an unread one ends the answer.
			if (module.fullHash || module.dependentHash) return null;
			const code = module.getGeneratedCode();
			if (code === null) continue;
			HANDLER_ASSIGNMENT.lastIndex = 0;
			let match;
			while ((match = HANDLER_ASSIGNMENT.exec(code)) !== null) {
				if (only !== null && only !== match[1]) return null;
				only = match[1];
			}
		}
		return only;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		// HMR force-loads through the handler map by bare chunk id, so a build can need
		// the map without the function around it.
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
			const args = `chunkId${withFetchPriority ? ", fetchPriority" : ""}`;
			const forwarded = `chunkId, promises${
				withFetchPriority ? ", fetchPriority" : ""
			}`;
			const only = this._onlyHandlerKey();
			// One handler needs no walk over the others, and most chunks carry one.
			const body =
				only === null
					? `return Promise.all(Object.keys(${handlers}).reduce(${runtimeTemplate.basicFunction(
							"promises, key",
							[`${handlers}[key](${forwarded});`, "return promises;"]
						)}, []));`
					: Template.asString([
							`${runtimeTemplate.renderConst()} promises = [];`,
							`${handlers}${propertyAccess([only])}(${forwarded});`,
							"return Promise.all(promises);"
						]);
			return Template.asString([
				`${handlers} = {};`,
				"// This file contains only the entry chunk.",
				"// The chunk loading function for additional chunks",
				`${RuntimeGlobals.ensureChunk} = ${runtimeTemplate.basicFunction(args, [
					body
				])};`
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
