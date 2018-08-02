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
/** @typedef {import("./DependencyTemplates")} DependencyTemplates} */
/** @typedef {import("webpack-sources").Source} Source} */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext} */

/**
 * @typedef {Object} RenderManifestOptions
 * @property {Chunk} chunk the chunk used to render
 * @property {string} hash
 * @property {string} fullHash
 * @property {TODO} outputOptions
 * @property {{javascript: ModuleTemplate, webassembly: ModuleTemplate}} moduleTemplates
 * @property {DependencyTemplates} dependencyTemplates
 */

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
			renderWithEntry: new SyncWaterfallHook(["source", "chunk"]),
			hash: new SyncHook(["hash"]),
			hashForChunk: new SyncHook(["hash", "chunk"])
		});
	}

	/**
	 *
	 * @param {RenderManifestOptions} options render manifest options
	 * @returns {TODO[]} returns render manifest
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
		hash.update("2");
		this.hooks.hash.call(hash);
	}

	/**
	 * Updates hash with chunk-specific information from this template
	 * @param {Hash} hash the hash to update
	 * @param {Chunk} chunk the chunk
	 * @returns {void}
	 */
	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}
};
