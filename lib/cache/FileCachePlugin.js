/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const createHash = require("../util/createHash");
const serializer = require("../util/serializer");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const memorize = fn => {
	let result = undefined;
	return () => {
		if (result === undefined) result = fn();
		return result;
	};
};

const memoryCache = new Map();

class FileCachePlugin {
	/**
	 * @param {FileCacheOptions} options options
	 */
	constructor(options) {
		this.options = options;
	}

	static purgeMemoryCache() {
		memoryCache.clear();
	}

	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const cacheDirectory = path.resolve(
			this.options.cacheDirectory || "node_modules/.cache/webpack/",
			this.options.name || "default"
		);
		const hashAlgorithm = this.options.hashAlgorithm || "md4";
		const version = this.options.version || "";
		const log = this.options.loglevel
			? { debug: 3, info: 2, warning: 1 }[this.options.loglevel]
			: 0;
		const store = this.options.store || "idle";

		let pendingPromiseFactories = new Map();
		const toHash = str => {
			const hash = createHash(hashAlgorithm);
			hash.update(str);
			const digest = hash.digest("hex");
			return `${digest.slice(0, 2)}/${digest.slice(2)}`;
		};
		compiler.cache.hooks.store.tapPromise(
			"FileCachePlugin",
			(identifier, etag, data) => {
				const entry = { identifier, data: () => data, etag, version };
				const filename = path.join(
					cacheDirectory,
					toHash(identifier) + ".data"
				);
				memoryCache.set(filename, entry);
				const promiseFactory = () =>
					serializer
						.serializeToFile(entry, filename)
						.then(() => {
							if (log >= 2) {
								console.warn(`Cached ${identifier} to ${filename}.`);
							}
						})
						.catch(err => {
							if (log >= 1) {
								console.warn(
									`Caching failed for ${identifier}: ${
										log >= 3 ? err.stack : err
									}`
								);
							}
						});
				if (store === "instant") {
					return promiseFactory();
				} else if (store === "idle") {
					pendingPromiseFactories.set(filename, promiseFactory);
					return Promise.resolve();
				} else if (store === "background") {
					const promise = promiseFactory();
					pendingPromiseFactories.set(filename, () => promise);
					return Promise.resolve();
				}
			}
		);
		compiler.cache.hooks.get.tapPromise(
			"FileCachePlugin",
			(identifier, etag) => {
				const filename = path.join(
					cacheDirectory,
					toHash(identifier) + ".data"
				);
				const memory = memoryCache.get(filename);
				if (memory !== undefined) {
					return Promise.resolve(
						memory.etag === etag && memory.version === version
							? memory.data()
							: undefined
					);
				}
				return serializer.deserializeFromFile(filename).then(
					cacheEntry => {
						cacheEntry = {
							identifier: cacheEntry.identifier,
							etag: cacheEntry.etag,
							version: cacheEntry.version,
							data: memorize(cacheEntry.data)
						};
						memoryCache.set(filename, cacheEntry);
						if (cacheEntry === undefined) return;
						if (cacheEntry.identifier !== identifier) {
							if (log >= 2) {
								console.warn(
									`Restored ${identifier} from ${filename}, but identifier doesn't match.`
								);
							}
							return;
						}
						if (cacheEntry.etag !== etag) {
							if (log >= 2) {
								console.warn(
									`Restored ${etag} from ${filename}, but etag doesn't match.`
								);
							}
							return;
						}
						if (cacheEntry.version !== version) {
							if (log >= 2) {
								console.warn(
									`Restored ${version} from ${filename}, but version doesn't match.`
								);
							}
							return;
						}
						if (log >= 2) {
							console.warn(`Restored ${identifier} from ${filename}.`);
						}
						return cacheEntry.data();
					},
					err => {
						if (log >= 1 && err && err.code !== "ENOENT") {
							console.warn(
								`Restoring failed for ${identifier} from ${filename}: ${
									log >= 3 ? err.stack : err
								}`
							);
						}
					}
				);
			}
		);
		compiler.cache.hooks.shutdown.tapPromise("FileCachePlugin", () => {
			isIdle = false;
			const promises = Array.from(pendingPromiseFactories.values()).map(fn =>
				fn()
			);
			pendingPromiseFactories.clear();
			if (currentIdlePromise !== undefined) promises.push(currentIdlePromise);
			return Promise.all(promises);
		});

		let currentIdlePromise;
		let isIdle = false;
		const processIdleTasks = () => {
			if (isIdle && pendingPromiseFactories.size > 0) {
				const promises = [];
				const maxTime = Date.now() + 100;
				let maxCount = 100;
				for (const [filename, factory] of pendingPromiseFactories) {
					pendingPromiseFactories.delete(filename);
					promises.push(factory());
					if (maxCount-- <= 0 || Date.now() > maxTime) break;
				}
				currentIdlePromise = Promise.all(promises).then(() => {
					currentIdlePromise = undefined;
				});
				currentIdlePromise.then(processIdleTasks);
			}
		};
		compiler.cache.hooks.beginIdle.tap("FileCachePlugin", () => {
			isIdle = true;
			Promise.resolve().then(processIdleTasks);
		});
		compiler.cache.hooks.endIdle.tap("FileCachePlugin", () => {
			isIdle = false;
		});
	}
}

module.exports = FileCachePlugin;
