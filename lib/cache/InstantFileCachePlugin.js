/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

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
			"InstantFileCachePlugin",
			(identifier, etag, data) => {
				return strategy.store(identifier, etag, data);
			}
		);

		compiler.cache.hooks.get.tapPromise(
			"InstantFileCachePlugin",
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

		compiler.cache.hooks.shutdown.tapPromise("InstantFileCachePlugin", () => {
			return (storing = storing.then(() => strategy.afterAllStored()));
		});

		compiler.cache.hooks.beginIdle.tap("InstantFileCachePlugin", () => {
			storing = storing.then(() => strategy.afterAllStored());
		});
	}
}

module.exports = InstantFileCachePlugin;
