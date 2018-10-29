/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const createHash = require("../util/createHash");
const makeSerializable = require("../util/makeSerializable");
const serializer = require("../util/serializer");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class Pack {
	constructor(version) {
		this.version = version;
		this.content = new Map();
		this.lastAccess = new Map();
		this.used = new Set();
		this.invalid = false;
	}

	get(relativeFilename) {
		this.used.add(relativeFilename);
		return this.content.get(relativeFilename);
	}

	set(relativeFilename, data) {
		this.used.add(relativeFilename);
		this.invalid = true;
		return this.content.set(relativeFilename, data);
	}

	collectGarbage(maxAge) {
		this._updateLastAccess();
		const now = Date.now();
		for (const [relativeFilename, lastAccess] of this.lastAccess) {
			if (now - lastAccess > maxAge) {
				this.lastAccess.delete(relativeFilename);
				this.content.delete(relativeFilename);
			}
		}
	}

	_updateLastAccess() {
		const now = Date.now();
		for (const relativeFilename of this.used) {
			this.lastAccess.set(relativeFilename, now);
		}
		this.used.clear();
	}

	serialize({ write, snapshot, rollback }) {
		this._updateLastAccess();
		write(this.version);
		for (const [relativeFilename, data] of this.content) {
			const s = snapshot();
			try {
				write(relativeFilename);
				write(data);
			} catch (err) {
				rollback(s);
				continue;
			}
		}
		write(null);
		write(this.lastAccess);
	}

	deserialize({ read }) {
		this.version = read();
		this.content = new Map();
		let relativeFilename = read();
		while (relativeFilename !== null) {
			this.content.set(relativeFilename, read());
			relativeFilename = read();
		}
		this.lastAccess = read();
	}
}

makeSerializable(Pack, "webpack/lib/cache/FileCachePlugin", "Pack");

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
			? { debug: 4, verbose: 3, info: 2, warning: 1 }[this.options.loglevel]
			: 0;
		const store = this.options.store || "pack";

		let pendingPromiseFactories = new Map();
		const toHash = str => {
			const hash = createHash(hashAlgorithm);
			hash.update(str);
			const digest = hash.digest("hex");
			return `${digest.slice(0, 2)}/${digest.slice(2)}`;
		};
		let packPromise;
		if (store === "pack") {
			packPromise = serializer
				.deserializeFromFile(`${cacheDirectory}.pack`)
				.then(cacheEntry => {
					if (cacheEntry) {
						if (!(cacheEntry instanceof Pack)) {
							if (log >= 3) {
								console.warn(
									`Restored pack from ${cacheDirectory}.pack, but is not a Pack.`
								);
							}
							return new Pack(version);
						}
						if (cacheEntry.version !== version) {
							if (log >= 3) {
								console.warn(
									`Restored pack from ${cacheDirectory}.pack, but version doesn't match.`
								);
							}
							return new Pack(version);
						}
						return cacheEntry;
					}
					return new Pack(version);
				})
				.catch(err => {
					if (log >= 1 && err && err.code !== "ENOENT") {
						console.warn(
							`Restoring pack failed from ${cacheDirectory}.pack: ${
								log >= 4 ? err.stack : err
							}`
						);
					}
					return new Pack(version);
				});
		}
		compiler.cache.hooks.store.tapPromise(
			"FileCachePlugin",
			(identifier, etag, data) => {
				const entry = {
					identifier,
					data: store === "pack" ? data : () => data,
					etag,
					version
				};
				const relativeFilename = toHash(identifier) + ".data";
				const filename = path.join(cacheDirectory, relativeFilename);
				memoryCache.set(filename, entry);
				const promiseFactory =
					store === "pack"
						? () =>
								packPromise.then(pack => {
									if (log >= 2) {
										console.warn(`Cached ${identifier} to pack.`);
									}
									pack.set(relativeFilename, entry);
								})
						: () =>
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
				if (store === "instant" || store === "pack") {
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
				const relativeFilename = toHash(identifier) + ".data";
				const filename = path.join(cacheDirectory, relativeFilename);
				const logMessage = store === "pack" ? "pack" : filename;
				const memory = memoryCache.get(filename);
				if (memory !== undefined) {
					return Promise.resolve(
						memory.etag !== etag || memory.version !== version
							? undefined
							: typeof memory.data === "function"
								? memory.data()
								: memory.data
					);
				}
				const cacheEntryPromise =
					store === "pack"
						? packPromise.then(pack => pack.get(relativeFilename))
						: serializer.deserializeFromFile(filename);
				return cacheEntryPromise.then(
					cacheEntry => {
						if (cacheEntry === undefined) return;
						if (typeof cacheEntry.data === "function")
							cacheEntry.data = memorize(cacheEntry.data);
						memoryCache.set(filename, cacheEntry);
						if (cacheEntry === undefined) return;
						if (cacheEntry.identifier !== identifier) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but identifier doesn't match.`
								);
							}
							return;
						}
						if (cacheEntry.etag !== etag) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but etag doesn't match.`
								);
							}
							return;
						}
						if (cacheEntry.version !== version) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but version doesn't match.`
								);
							}
							return;
						}
						if (log >= 3) {
							console.warn(`Restored ${identifier} from ${logMessage}.`);
						}
						if (typeof cacheEntry.data === "function") return cacheEntry.data();
						return cacheEntry.data;
					},
					err => {
						if (log >= 1 && err && err.code !== "ENOENT") {
							console.warn(
								`Restoring failed for ${identifier} from ${logMessage}: ${
									log >= 4 ? err.stack : err
								}`
							);
						}
					}
				);
			}
		);
		const serializePack = () => {
			packPromise = packPromise.then(pack => {
				if (!pack.invalid) return pack;
				if (log >= 3) {
					console.warn(`Storing pack...`);
				}
				pack.collectGarbage(1000 * 60 * 60 * 24 * 2);
				return serializer
					.serializeToFile(pack, `${cacheDirectory}.pack~`)
					.then(
						result =>
							new Promise((resolve, reject) => {
								if (!result) {
									if (log >= 1) {
										console.warn(
											'Caching failed for pack, because content is flagged as not serializable. Use store: "idle" instead.'
										);
									}
									return;
								}
								fs.unlink(`${cacheDirectory}.pack`, err => {
									fs.rename(
										`${cacheDirectory}.pack~`,
										`${cacheDirectory}.pack`,
										err => {
											if (err) return reject(err);
											if (log >= 3) {
												console.warn(`Stored pack`);
											}
											resolve();
										}
									);
								});
							})
					)
					.then(() => {
						return serializer.deserializeFromFile(`${cacheDirectory}.pack`);
					})
					.catch(err => {
						if (log >= 1) {
							console.warn(
								`Caching failed for pack: ${log >= 4 ? err.stack : err}`
							);
						}
						return new Pack(version);
					});
			});
			return packPromise;
		};
		compiler.cache.hooks.shutdown.tapPromise("FileCachePlugin", () => {
			isIdle = false;
			const promises = Array.from(pendingPromiseFactories.values()).map(fn =>
				fn()
			);
			pendingPromiseFactories.clear();
			if (currentIdlePromise !== undefined) promises.push(currentIdlePromise);
			const promise = Promise.all(promises);
			if (store === "pack") {
				return promise.then(serializePack);
			}
			return promise;
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
			if (store === "pack") {
				pendingPromiseFactories.delete("pack");
				pendingPromiseFactories.set("pack", serializePack);
			}
			Promise.resolve().then(processIdleTasks);
		});
		compiler.cache.hooks.endIdle.tap("FileCachePlugin", () => {
			isIdle = false;
		});
	}
}

module.exports = FileCachePlugin;
