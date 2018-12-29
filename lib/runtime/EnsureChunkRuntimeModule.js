/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class EnsureChunkRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("ensure chunk");
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		// Check if there are non initial chunks which need to be imported using require-ensure
		if (this.runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers)) {
			const handlers = RuntimeGlobals.ensureChunkHandlers;
			return Template.asString([
				`${handlers} = {};`,
				"// This file contains only the entry chunk.",
				"// The chunk loading function for additional chunks",
				`${RuntimeGlobals.ensureChunk} = function requireEnsure(chunkId) {`,
				Template.indent([
					`return Promise.all(Object.keys(${handlers}).reduce(function(promises, key) { ${handlers}[key](chunkId, promises); return promises; }, []));`
				]),
				"};"
			]);
		} else {
			// There ensureChunk is used somewhere in the tree, so we need an empty requireEnsure
			// function. This can happen with multiple entrypoints.
			return Template.asString([
				"// The chunk loading function for additional chunks",
				"// Since all referenced chunks are already included",
				"// in this file, this function is empty here.",
				`${RuntimeGlobals.ensureChunk} = function requireEnsure() {`,
				Template.indent("return Promise.resolve();"),
				"};"
			]);
		}
	}
}

module.exports = EnsureChunkRuntimeModule;
