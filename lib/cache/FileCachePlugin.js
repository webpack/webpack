/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const createHash = require("../util/createHash");
const makeSerializable = require("../util/makeSerializable");
const {
	serializer,
	NOT_SERIALIZABLE,
	MEASURE_START_OPERATION,
	MEASURE_END_OPERATION
} = require("../util/serialization");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const MAX_INLINE_SIZE = 20000;

class Pack {
	constructor(version, log) {
		this.version = version;
		this.etags = new Map();
		/** @type {Map<string, any | (() => Promise<PackEntry>)>} */
		this.content = new Map();
		this.lastAccess = new Map();
		this.lastSizes = new Map();
		this.unserializable = new Set();
		this.used = new Set();
		this.invalid = false;
		this.log = log;
	}

	get(identifier, etag) {
		const etagInCache = this.etags.get(identifier);
		if (etagInCache === undefined) return undefined;
		if (etagInCache !== etag) return undefined;
		this.used.add(identifier);
		const content = this.content.get(identifier);
		if (typeof content === "function") {
			return Promise.resolve(content()).then(entry =>
				this._unpack(identifier, entry, false)
			);
		} else {
			return content;
		}
	}

	set(identifier, etag, data) {
		if (this.unserializable.has(identifier)) return;
		this.used.add(identifier);
		this.invalid = true;
		this.etags.set(identifier, etag);
		return this.content.set(identifier, data);
	}

	collectGarbage(maxAge) {
		this._updateLastAccess();
		const now = Date.now();
		for (const [identifier, lastAccess] of this.lastAccess) {
			if (now - lastAccess > maxAge) {
				this.lastAccess.delete(identifier);
				this.etags.delete(identifier);
				this.content.delete(identifier);
			}
		}
	}

	setLogLevel(log) {
		this.log = log;
	}

	_updateLastAccess() {
		const now = Date.now();
		for (const identifier of this.used) {
			this.lastAccess.set(identifier, now);
		}
		this.used.clear();
	}

	serialize({ write }) {
		this._updateLastAccess();
		write(this.version);
		write(this.log);
		write(this.etags);
		write(this.unserializable);
		write(this.lastAccess);
		for (const [identifier, data] of this.content) {
			write(identifier);
			if (typeof data === "function") {
				write(data);
			} else {
				const packEntry = new PackEntry(data, this.log, identifier);
				const lastSize = this.lastSizes.get(identifier);
				if (lastSize > MAX_INLINE_SIZE) {
					write(() => packEntry);
				} else {
					write(packEntry);
				}
			}
		}
		write(null);
	}

	deserialize({ read }) {
		this.version = read();
		this.log = read();
		this.etags = read();
		this.unserializable = read();
		this.lastAccess = read();
		this.content = new Map();
		let identifier = read();
		while (identifier !== null) {
			const entry = read();
			if (typeof entry === "function") {
				this.content.set(identifier, entry);
			} else {
				this.content.set(identifier, this._unpack(identifier, entry, true));
			}
			identifier = read();
		}
	}

	_unpack(identifier, entry, currentlyInline) {
		const { data, size } = entry;
		if (data === undefined) {
			this.unserializable.add(identifier);
			this.lastSizes.delete(identifier);
			return undefined;
		} else {
			this.lastSizes.set(identifier, size);
			if (currentlyInline) {
				if (size > MAX_INLINE_SIZE) {
					this.invalid = true;
					if (this.log >= 3) {
						console.warn(
							`Moved ${identifier} from inline to lazy section for better performance.`
						);
					}
				}
			} else {
				if (size <= MAX_INLINE_SIZE) {
					this.content.set(identifier, data);
					this.invalid = true;
					if (this.log >= 3) {
						console.warn(
							`Moved ${identifier} from lazy to inline section for better performance.`
						);
					}
				}
			}
			return data;
		}
	}
}

makeSerializable(Pack, "webpack/lib/cache/FileCachePlugin", "Pack");

class PackEntry {
	constructor(data, log, identifier) {
		this.data = data;
		this.size = undefined;
		this.log = log;
		this.identifier = identifier;
	}

	serialize({ write, snapshot, rollback }) {
		const s = snapshot();
		try {
			write(true);
			if (this.size === undefined) {
				write(MEASURE_START_OPERATION);
				write(this.data);
				write(MEASURE_END_OPERATION);
			} else {
				write(this.data);
				write(this.size);
			}
		} catch (err) {
			if (this.log >= 1 && err !== NOT_SERIALIZABLE) {
				console.warn(
					`Caching failed for ${this.identifier}: ${
						this.log >= 4 ? err.stack : err
					}\nWe will not try to cache this entry again until the cache file is deleted.`
				);
			}
			rollback(s);
			write(false);
		}
	}

	deserialize({ read }) {
		if (read()) {
			this.data = read();
			this.size = read();
		}
	}
}

makeSerializable(PackEntry, "webpack/lib/cache/FileCachePlugin", "PackEntry");

class FileCachePlugin {
	/**
	 * @param {FileCacheOptions} options options
	 */
	constructor(options) {
		this.options = options;
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
		const idleTimeout = this.options.idleTimeout || 10000;
		const idleTimeoutForInitialStore = Math.min(
			idleTimeout,
			this.options.idleTimeoutForInitialStore || 0
		);

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
							return new Pack(version, log);
						}
						if (cacheEntry.version !== version) {
							if (log >= 3) {
								console.warn(
									`Restored pack from ${cacheDirectory}.pack, but version doesn't match.`
								);
							}
							return new Pack(version, log);
						}
						cacheEntry.setLogLevel(log);
						return cacheEntry;
					}
					return new Pack(version, log);
				})
				.catch(err => {
					if (log >= 1 && err && err.code !== "ENOENT") {
						console.warn(
							`Restoring pack failed from ${cacheDirectory}.pack: ${
								log >= 4 ? err.stack : err
							}`
						);
					}
					return new Pack(version, log);
				});
		}
		const storeEntry = (identifier, etag, data) => {
			const promiseFactory =
				store === "pack"
					? () =>
							packPromise.then(pack => {
								if (log >= 2) {
									console.warn(`Cached ${identifier} to pack.`);
								}
								pack.set(identifier, etag, data);
							})
					: () => {
							const entry = {
								identifier,
								data: etag ? () => data : data,
								etag,
								version
							};
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

		compiler.cache.hooks.get.tapPromise(
			"FileCachePlugin",
			(identifier, etag, gotHandlers) => {
				let logMessage;
				let cacheEntryPromise;
				const registerGot = () => {
					gotHandlers.push((result, callback) => {
						if (result !== undefined) {
							storeEntry(identifier, etag, result).then(callback, callback);
						} else {
							callback();
						}
					});
				};
				if (store === "pack") {
					logMessage = "pack";
					cacheEntryPromise = packPromise.then(pack =>
						pack.get(identifier, etag)
					);
				} else {
					const relativeFilename = toHash(identifier) + ".data";
					const filename = path.join(cacheDirectory, relativeFilename);
					logMessage = filename;
					cacheEntryPromise = serializer
						.deserializeFromFile(filename)
						.then(cacheEntry => {
							if (cacheEntry === undefined) {
								return registerGot();
							}
							if (cacheEntry.identifier !== identifier) {
								if (log >= 3) {
									console.warn(
										`Restored ${identifier} from ${logMessage}, but identifier doesn't match.`
									);
								}
								return registerGot();
							}
							if (cacheEntry.etag !== etag) {
								if (log >= 3) {
									console.warn(
										`Restored ${identifier} from ${logMessage}, but etag doesn't match.`
									);
								}
								return registerGot();
							}
							if (cacheEntry.version !== version) {
								if (log >= 3) {
									console.warn(
										`Restored ${identifier} from ${logMessage}, but version doesn't match.`
									);
								}
								return registerGot();
							}
							if (log >= 3) {
								console.warn(`Restored ${identifier} from ${logMessage}.`);
							}
							if (typeof cacheEntry.data === "function")
								return cacheEntry.data();
							return cacheEntry.data;
						});
				}
				return cacheEntryPromise.catch(err => {
					if (log >= 1 && err && err.code !== "ENOENT") {
						console.warn(
							`Restoring failed for ${identifier} from ${logMessage}: ${
								log >= 4 ? err.stack : err
							}`
						);
					}
					registerGot();
				});
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
						return new Pack(version, log);
					});
			});
		};
		compiler.cache.hooks.shutdown.tapPromise("FileCachePlugin", () => {
			if (idleTimer) {
				clearTimeout(idleTimer);
				idleTimer = undefined;
			}
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
		let isInitialStore = true;
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
					currentIdlePromise.then(() => {
						// Allow to exit the process inbetween
						setTimeout(processIdleTasks, 0).unref();
					});
					return;
				}
				if (store === "pack") {
					currentIdlePromise = serializePack();
				}
				isInitialStore = false;
			}
		};
		let idleTimer = undefined;
		compiler.cache.hooks.beginIdle.tap("FileCachePlugin", () => {
			idleTimer = setTimeout(() => {
				idleTimer = undefined;
				isIdle = true;
				resolvedPromise.then(processIdleTasks);
			}, isInitialStore ? idleTimeoutForInitialStore : idleTimeout);
			idleTimer.unref();
		});
		compiler.cache.hooks.endIdle.tap("FileCachePlugin", () => {
			if (idleTimer) {
				clearTimeout(idleTimer);
				idleTimer = undefined;
			}
			isIdle = false;
		});
	}
}

module.exports = FileCachePlugin;
