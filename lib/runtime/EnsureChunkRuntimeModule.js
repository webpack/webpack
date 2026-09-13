/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const { getOnlyHandlerKey } = require("../util/handlerKeys");
const { propertyAccess } = require("../util/property");

/** @type {[string, string][]} */
const NO_INSTALLED_HANDLERS = [];

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
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f` — `null` where it installs one it cannot name,
	 * and `undefined` where it says nothing and its code is read instead. Stating it
	 * spares that read, which for a module keyed on a hash means rendering it twice.
	 * @returns {[string, string][] | null | undefined} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		// Reads a map rather than installing onto one, so reading its code back would
		// render it in a cycle.
		return NO_INSTALLED_HANDLERS;
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
			const only = getOnlyHandlerKey(this, handlers);
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
