/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { Tapable, SyncWaterfallHook, SyncHook } = require("tapable");

/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("crypto").Hash} Hash */

/**
 * @typedef {Object} RenderManifestOptions
 * @property {Chunk} chunk the chunk used to render
 * @property {Hash} hash
 * @property {string} fullHash
 * @property {any} outputOptions
 * @property {{javascript: ModuleTemplate, webassembly: ModuleTemplate}} moduleTemplates
 * @property {Map} dependencyTemplates
 */

module.exports = class ChunkTemplate extends Tapable {
	constructor(outputOptions) {
		super();
		this.outputOptions = outputOptions || {};
		this.hooks = {
			renderManifest: new SyncWaterfallHook(["result", "options"]),
			modules: new SyncWaterfallHook([
				"source",
				"chunk",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			render: new SyncWaterfallHook([
				"source",
				"chunk",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			renderWithEntry: new SyncWaterfallHook(["source", "chunk"]),
			hash: new SyncHook(["hash"]),
			hashForChunk: new SyncHook(["hash", "chunk"])
		};
	}

	/**
	 *
	 * @param {RenderManifestOptions} options render manifest options
	 * @returns {any[]} returns render manifest
	 */
	getRenderManifest(options) {
		const result = [];

		this.hooks.renderManifest.call(result, options);

		return result;
	}

	updateHash(hash) {
		hash.update("ChunkTemplate");
		hash.update("2");
		this.hooks.hash.call(hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}
};
