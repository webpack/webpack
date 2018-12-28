/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const createHash = require("../util/createHash");
const makeSerializable = require("../util/makeSerializable");
const { serializer } = require("../util/serialization");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class Pack {
	constructor(version) {
		this.version = version;
		this.content = new Map();
		this.lastAccess = new Map();
		this.unserializable = new Set();
		this.used = new Set();
		this.invalid = false;
	}

	get(identifier) {
		this.used.add(identifier);
		return this.content.get(identifier);
	}

	set(identifier, data) {
		if (this.unserializable.has(identifier)) return;
		this.used.add(identifier);
		this.invalid = true;
		return this.content.set(identifier, data);
	}

	collectGarbage(maxAge) {
		this._updateLastAccess();
		const now = Date.now();
		for (const [identifier, lastAccess] of this.lastAccess) {
			if (now - lastAccess > maxAge) {
				this.lastAccess.delete(identifier);
				this.content.delete(identifier);
			}
		}
	}

	_updateLastAccess() {
		const now = Date.now();
		for (const identifier of this.used) {
			this.lastAccess.set(identifier, now);
		}
		this.used.clear();
	}

	serialize({ write, snapshot, rollback }) {
		this._updateLastAccess();
		write(this.version);
		for (const [identifier, data] of this.content) {
			const s = snapshot();
			try {
				write(identifier);
				write(data);
			} catch (err) {
				rollback(s);
				this.unserializable.add(identifier);
				continue;
			}
		}
		write(null);
		write(this.lastAccess);
		write(this.unserializable);
	}

	deserialize({ read }) {
		this.version = read();
		this.content = new Map();
		let identifier = read();
		while (identifier !== null) {
			this.content.set(identifier, read());
			identifier = read();
		}
		this.lastAccess = read();
		this.unserializable = read();
	}
}

makeSerializable(Pack, "webpack/lib/cache/FileCachePlugin", "Pack");

class FileCachePlugin {
	/**
	 * @param {FileCacheOptions} options options
	 */
	constructor(options) {
		this.options = options;
		this.missingEntries = new Set();
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

		const resolvedPromise = Promise.resolve();

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
		const storeEntry = (identifier, etag, data) => {
			this.missingEntries.delete(identifier);
			const entry = {
				identifier,
				data: etag ? () => data : data,
				etag,
				version
			};
			const promiseFactory =
				store === "pack"
					? () =>
							packPromise.then(pack => {
								if (log >= 2) {
									console.warn(`Cached ${identifier} to pack.`);
								}
								pack.set(identifier, entry);
							})
					: () => {
							const relativeFilename = toHash(identifier) + ".data";
							const filename = path.join(cacheDirectory, relativeFilename);
							return serializer
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
					  };
			if (store === "instant") {
				return promiseFactory();
			} else if (store === "idle" || store === "pack") {
				pendingPromiseFactories.set(identifier, promiseFactory);
				return resolvedPromise;
			} else if (store === "background") {
				const promise = promiseFactory();
				pendingPromiseFactories.set(identifier, () => promise);
				return resolvedPromise;
			}
		};
		compiler.cache.hooks.store.tapPromise("FileCachePlugin", storeEntry);
		compiler.cache.hooks.got.tapPromise(
			"FileCachePlugin",
			(identifier, etag, result) => {
				if (result !== undefined && this.missingEntries.has(identifier)) {
					return storeEntry(identifier, etag, result);
				} else {
					return resolvedPromise;
				}
			}
		);

		compiler.cache.hooks.get.tapPromise(
			"FileCachePlugin",
			(identifier, etag) => {
				let logMessage;
				let cacheEntryPromise;
				if (store === "pack") {
					logMessage = "pack";
					cacheEntryPromise = packPromise.then(pack => pack.get(identifier));
				} else {
					const relativeFilename = toHash(identifier) + ".data";
					const filename = path.join(cacheDirectory, relativeFilename);
					logMessage = filename;
					cacheEntryPromise = serializer.deserializeFromFile(filename);
				}
				return cacheEntryPromise.then(
					cacheEntry => {
						if (cacheEntry === undefined) {
							this.missingEntries.add(identifier);
							return;
						}
						if (cacheEntry.identifier !== identifier) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but identifier doesn't match.`
								);
							}
							this.missingEntries.add(identifier);
							return;
						}
						if (cacheEntry.etag !== etag) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but etag doesn't match.`
								);
							}
							this.missingEntries.add(identifier);
							return;
						}
						if (cacheEntry.version !== version) {
							if (log >= 3) {
								console.warn(
									`Restored ${identifier} from ${logMessage}, but version doesn't match.`
								);
							}
							this.missingEntries.add(identifier);
							return;
						}
						if (log >= 3) {
							console.warn(`Restored ${identifier} from ${logMessage}.`);
						}
						if (typeof cacheEntry.data === "function") return cacheEntry.data();
						return cacheEntry.data;
					},
					err => {
						this.missingEntries.add(identifier);
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
			return packPromise.then(pack => {
				if (!pack.invalid) return;
				if (log >= 3) {
					console.warn(`Storing pack...`);
				}
				pack.collectGarbage(1000 * 60 * 60 * 24 * 2);
				// You might think this breaks all access to the existing pack
				// which are still referenced, but serializing the pack memorizes
				// all data in the pack and makes it no longer need the backing file
				// So it's safe to replace the pack file
				return serializer
					.serializeToFile(pack, `${cacheDirectory}.pack`)
					.then(() => {
						if (log >= 3) {
							console.warn(`Stored pack`);
						}
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
		};
		compiler.cache.hooks.shutdown.tapPromise("FileCachePlugin", () => {
			isIdle = false;
			const promises = Array.from(pendingPromiseFactories.values()).map(fn =>
				fn()
			);
			pendingPromiseFactories.clear();
			if (currentIdlePromise !== undefined) promises.push(currentIdlePromise);
			let promise = Promise.all(promises);
			if (store === "pack") {
				promise = promise.then(serializePack);
			}
			return promise;
		});

		let currentIdlePromise;
		let isIdle = false;
		const processIdleTasks = () => {
			if (isIdle) {
				if (pendingPromiseFactories.size > 0) {
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
				} else if (store === "pack") {
					currentIdlePromise = serializePack();
				}
			}
		};
		compiler.cache.hooks.beginIdle.tap("FileCachePlugin", () => {
			isIdle = true;
			resolvedPromise.then(processIdleTasks);
		});
		compiler.cache.hooks.endIdle.tap("FileCachePlugin", () => {
			isIdle = false;
		});
	}
}

module.exports = FileCachePlugin;
