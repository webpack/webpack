/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");

/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("./util/createHash").Hash} Hash} */
/** @typedef {import("webpack-sources").Source} Source} */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext} */
/** @typedef {import("./MainTemplate").UpdateHashForChunkContext} UpdateHashForChunkContext} */
/** @typedef {import("./Template").RenderManifestOptions} RenderManifestOptions} */
/** @typedef {import("./Template").RenderManifestEntry} RenderManifestEntry} */

module.exports = class ChunkTemplate {
	constructor(outputOptions) {
		this.outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<TODO[], RenderManifestOptions>} */
			renderManifest: new SyncWaterfallHook(["result", "options"]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, RenderContext>} */
			modules: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, RenderContext>} */
			render: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<Source, Chunk>} */
			renderWithEntry: new SyncWaterfallHook(["source", "chunk"]),
			/** @type {SyncHook<Hash>} */
			hash: new SyncHook(["hash"]),
			/** @type {SyncHook<Hash, Chunk>} */
			hashForChunk: new SyncHook(["hash", "chunk"])
		});
	}

	/**
	 *
	 * @param {RenderManifestOptions} options render manifest options
	 * @returns {RenderManifestEntry[]} returns render manifest
	 */
	getRenderManifest(options) {
		const result = [];

		this.hooks.renderManifest.call(result, options);

		return result;
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("ChunkTemplate");
		hash.update("3");
		this.hooks.hash.call(hash);
	}

	/**
	 * TODO webpack 5: remove moduleTemplate and dependencyTemplates
	 * Updates hash with chunk-specific information from this template
	 * @param {Hash} hash the hash to update
	 * @param {Chunk} chunk the chunk
	 * @param {UpdateHashForChunkContext} context options object
	 * @returns {void}
	 */
	updateHashForChunk(hash, chunk, context) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}
};
