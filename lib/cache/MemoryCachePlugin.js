/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class MemoryCachePlugin {
	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Map<string, Module>} */
		const moduleCache = new Map();
		/** @type {Map<string, { hash: string, source: Source }>} */
		const assetCache = new Map();
		compiler.cache.hooks.storeModule.tap(
			"MemoryCachePlugin",
			(identifier, module) => {
				moduleCache.set(identifier, module);
			}
		);
		compiler.cache.hooks.getModule.tap("MemoryCachePlugin", identifier => {
			return moduleCache.get(identifier);
		});
		compiler.cache.hooks.storeAsset.tap(
			"MemoryCachePlugin",
			(identifier, hash, source) => {
				assetCache.set(identifier, { hash, source });
			}
		);
		compiler.cache.hooks.getAsset.tap(
			"MemoryCachePlugin",
			(identifier, hash) => {
				const cacheEntry = assetCache.get(identifier);
				if (cacheEntry !== undefined && cacheEntry.hash === hash) {
					return cacheEntry.source;
				}
			}
		);
	}
}
module.exports = MemoryCachePlugin;
