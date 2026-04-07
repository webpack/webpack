/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that re-emits legacy main-template bootstrap hooks for
 * backwards compatibility with older runtime integrations.
 */
class CompatRuntimeModule extends RuntimeModule {
	/**
	 * Creates the compatibility runtime module attached alongside the main
	 * runtime.
	 */
	constructor() {
		super("compat", RuntimeModule.STAGE_ATTACH);
		/** @type {boolean} */
		this.fullHash = true;
	}

	/**
	 * Generates compatibility runtime snippets from the deprecated
	 * `MainTemplate` hook pipeline and wires them into the current runtime.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const {
			runtimeTemplate,
			mainTemplate,
			moduleTemplates,
			dependencyTemplates
		} = compilation;
		const bootstrap = mainTemplate.hooks.bootstrap.call(
			"",
			chunk,
			compilation.hash || "XXXX",
			moduleTemplates.javascript,
			dependencyTemplates
		);
		const localVars = mainTemplate.hooks.localVars.call(
			"",
			chunk,
			compilation.hash || "XXXX"
		);
		const requireExtensions = mainTemplate.hooks.requireExtensions.call(
			"",
			chunk,
			compilation.hash || "XXXX"
		);
		const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
		let requireEnsure = "";
		if (runtimeRequirements.has(RuntimeGlobals.ensureChunk)) {
			const requireEnsureHandler = mainTemplate.hooks.requireEnsure.call(
				"",
				chunk,
				compilation.hash || "XXXX",
				"chunkId"
			);
			if (requireEnsureHandler) {
				requireEnsure = `${
					RuntimeGlobals.ensureChunkHandlers
				}.compat = ${runtimeTemplate.basicFunction(
					"chunkId, promises",
					requireEnsureHandler
				)};`;
			}
		}
		return [bootstrap, localVars, requireEnsure, requireExtensions]
			.filter(Boolean)
			.join("\n");
	}

	/**
	 * Keeps the compatibility runtime in the surrounding scope so legacy code
	 * continues to observe the expected variables and hook behavior.
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		// We avoid isolating this to have better backward-compat
		return false;
	}
}

module.exports = CompatRuntimeModule;
