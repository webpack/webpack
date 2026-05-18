/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");
const MemoryStore = require("./MemoryStore");

/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {object} MemoryWithGcCachePluginOptions
 * @property {number} maxGenerations max generations
 */

const PLUGIN_NAME = "MemoryWithGcCachePlugin";

class MemoryWithGcCachePlugin {
	/**
	 * @param {MemoryWithGcCachePluginOptions} options options
	 */
	constructor({ maxGenerations }) {
		this._maxGenerations = maxGenerations;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const store = new MemoryStore({
			maxGenerations: this._maxGenerations,
			logger: compiler.getInfrastructureLogger(PLUGIN_NAME)
		});
		compiler.hooks.afterDone.tap(PLUGIN_NAME, () => store.afterDone());
		compiler.cache.hooks.store.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => store.store(identifier, etag, data)
		);
		compiler.cache.hooks.get.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
			(identifier, etag, gotHandlers) => {
				const cacheEntry = store.restore(identifier, etag);
				if (cacheEntry !== undefined) return cacheEntry;
				gotHandlers.push((result, callback) => {
					store.rememberResult(identifier, etag, result);
					return callback();
				});
			}
		);
		compiler.cache.hooks.shutdown.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
			() => store.clear()
		);
	}
}

module.exports = MemoryWithGcCachePlugin;
