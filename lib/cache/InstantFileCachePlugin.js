/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @typedef {import("../Compiler")} Compiler */

class InstantFileCachePlugin {
	constructor(strategy) {
		this.strategy = strategy;
	}

	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const strategy = this.strategy;

		compiler.cache.hooks.store.tapPromise(
			{ name: "InstantFileCachePlugin", stage: Cache.STAGE_DISK },
			(identifier, etag, data) => {
				return strategy.store(identifier, etag, data);
			}
		);

		compiler.cache.hooks.get.tapPromise(
			{ name: "InstantFileCachePlugin", stage: Cache.STAGE_DISK },
			(identifier, etag, gotHandlers) => {
				return strategy.restore(identifier, etag).then(cacheEntry => {
					if (cacheEntry === undefined) {
						gotHandlers.push((result, callback) => {
							if (result !== undefined) {
								strategy
									.store(identifier, etag, result)
									.then(callback, callback);
							} else {
								callback();
							}
						});
					} else {
						return cacheEntry;
					}
				});
			}
		);

		let storing = Promise.resolve();

		compiler.cache.hooks.shutdown.tapPromise(
			{ name: "InstantFileCachePlugin", stage: Cache.STAGE_DISK },
			() => {
				return (storing = storing.then(() => strategy.afterAllStored()));
			}
		);

		compiler.cache.hooks.beginIdle.tap(
			{ name: "InstantFileCachePlugin", stage: Cache.STAGE_DISK },
			() => {
				storing = storing.then(() => strategy.afterAllStored());
			}
		);
	}
}

module.exports = InstantFileCachePlugin;
