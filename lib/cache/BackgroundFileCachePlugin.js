/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */

class BackgroundFileCachePlugin {
	constructor(strategy) {
		this.strategy = strategy;
	}

	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const strategy = this.strategy;

		/** @type {Set<Promise>} */
		const pending = new Set();

		compiler.cache.hooks.store.tap(
			"BackgroundFileCachePlugin",
			(identifier, etag, data) => {
				const promise = strategy.store(identifier, etag, data);
				pending.add(promise);
				promise.then(() => {
					pending.delete(promise);
				});
			}
		);

		compiler.cache.hooks.get.tapPromise(
			"BackgroundFileCachePlugin",
			(identifier, etag, gotHandlers) => {
				return strategy.restore(identifier, etag).then(cacheEntry => {
					if (cacheEntry === undefined) {
						gotHandlers.push((result, callback) => {
							if (result !== undefined) {
								const promise = strategy.store(identifier, etag, result);
								pending.add(promise);
								promise.then(() => {
									pending.delete(promise);
								});
								callback();
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
			"BackgroundFileCachePlugin",
			() => {
				return (storing = storing.then(() => {
					const promise = Promise.all(Array.from(pending)).then(() =>
						strategy.afterAllStored()
					);
					pending.clear();
					return promise;
				}));
			}
		);

		compiler.cache.hooks.beginIdle.tap("BackgroundFileCachePlugin", () => {
			storing = storing.then(() => {
				const promise = Promise.all(Array.from(pending)).then(() =>
					strategy.afterAllStored()
				);
				pending.clear();
				return promise;
			});
		});
	}
}

module.exports = BackgroundFileCachePlugin;
