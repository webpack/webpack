/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FileSystemInfo = require("../FileSystemInfo");
const LazySet = require("../util/LazySet");
const makeSerializable = require("../util/makeSerializable");
const memorize = require("../util/memorize");
const { createFileSerializer } = require("../util/serialization");

/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../logging/Logger").Logger} Logger */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

class PackContainer {
	/**
	 * @param {Object} data stored data
	 * @param {string} version version identifier
	 * @param {FileSystemInfo.Snapshot} buildSnapshot snapshot of all build dependencies
	 * @param {Set<string>} buildDependencies list of all unresolved build dependencies captured
	 * @param {Map<string, string>} resolveResults result of the resolved build dependencies
	 * @param {FileSystemInfo.Snapshot} resolveBuildDependenciesSnapshot snapshot of the dependencies of the build dependencies resolving
	 */
	constructor(
		data,
		version,
		buildSnapshot,
		buildDependencies,
		resolveResults,
		resolveBuildDependenciesSnapshot
	) {
		this.data = data;
		this.version = version;
		this.buildSnapshot = buildSnapshot;
		this.buildDependencies = buildDependencies;
		this.resolveResults = resolveResults;
		this.resolveBuildDependenciesSnapshot = resolveBuildDependenciesSnapshot;
	}

	serialize({ write, writeLazy }) {
		write(this.version);
		write(this.buildSnapshot);
		write(this.buildDependencies);
		write(this.resolveResults);
		write(this.resolveBuildDependenciesSnapshot);
		writeLazy(this.data);
	}

	deserialize({ read }) {
		this.version = read();
		this.buildSnapshot = read();
		this.buildDependencies = read();
		this.resolveResults = read();
		this.resolveBuildDependenciesSnapshot = read();
		this.data = read();
	}
}

makeSerializable(
	PackContainer,
	"webpack/lib/cache/PackFileCacheStrategy",
	"PackContainer"
);

const MIN_CONTENT_SIZE = 1024 * 1024; // 1 MB
const CONTENT_COUNT_TO_MERGE = 10;
const MAX_AGE = 1000 * 60 * 60 * 24 * 60; // 1 month

class PackItemInfo {
	/**
	 * @param {string} identifier identifier of item
	 * @param {string | null} etag etag of item
	 * @param {any} value fresh value of item
	 */
	constructor(identifier, etag, value) {
		this.identifier = identifier;
		this.etag = etag;
		this.location = -1;
		this.lastAccess = Date.now();
		this.freshValue = value;
	}
}

class Pack {
	constructor(logger) {
		/** @type {Map<string, PackItemInfo>} */
		this.itemInfo = new Map();
		/** @type {PackItemInfo[]} */
		this.freshContent = [];
		/** @type {(undefined | PackContent)[]} */
		this.content = [];
		this.invalid = false;
		this.logger = logger;
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {string | null} etag etag of the resource
	 * @returns {any} cached content
	 */
	get(identifier, etag) {
		const info = this.itemInfo.get(identifier);
		if (info === undefined) return undefined;
		if (info.etag !== etag) return null;
		info.lastAccess = Date.now();
		const loc = info.location;
		if (loc === -1) {
			return info.freshValue;
		} else {
			if (!this.content[loc]) {
				return undefined;
			}
			return this.content[loc].get(identifier);
		}
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {string | null} etag etag of the resource
	 * @param {any} data cached content
	 * @returns {void}
	 */
	set(identifier, etag, data) {
		if (!this.invalid) {
			this.invalid = true;
			this.logger.debug(`Pack got invalid because of ${identifier}`);
		}
		const info = this.itemInfo.get(identifier);
		if (info === undefined) {
			const newInfo = new PackItemInfo(identifier, etag, data);
			this.itemInfo.set(identifier, newInfo);
			this.freshContent.push(newInfo);
		} else {
			const loc = info.location;
			if (loc >= 0) {
				this.freshContent.push(info);
				const content = this.content[loc];
				content.delete(identifier);
				if (content.items.size === 0) {
					this.content[loc] = undefined;
					this.logger.debug("Pack %d got empty and is removed", loc);
				}
			}
			info.freshValue = data;
			info.lastAccess = Date.now();
			info.etag = etag;
			info.location = -1;
		}
	}

	/**
	 * @returns {number} new location of data entries
	 */
	_findLocation() {
		let i;
		for (i = 0; i < this.content.length && this.content[i] !== undefined; i++);
		return i;
	}

	_gcAndUpdateLocation(items, usedItems, newLoc) {
		let count = 0;
		let lastGC;
		const now = Date.now();
		for (const identifier of items) {
			const info = this.itemInfo.get(identifier);
			if (now - info.lastAccess > MAX_AGE) {
				this.itemInfo.delete(identifier);
				items.delete(identifier);
				usedItems.delete(identifier);
				count++;
				lastGC = identifier;
			} else {
				info.location = newLoc;
			}
		}
		if (count > 0) {
			this.logger.log(
				"Garbage Collected %d old items at pack %d e. g. %s",
				count,
				newLoc,
				lastGC
			);
		}
	}

	_persistFreshContent() {
		if (this.freshContent.length > 0) {
			/** @type {Set<string>} */
			const items = new Set();
			/** @type {Map<string, any>} */
			const map = new Map();
			const loc = this._findLocation();
			for (const info of this.freshContent) {
				const { identifier } = info;
				items.add(identifier);
				map.set(identifier, info.freshValue);
				info.location = loc;
				info.freshValue = undefined;
			}
			this.content[loc] = new PackContent(items, new Set(items), map);
			this.freshContent.length = 0;
		}
	}

	/**
	 * Merges small content files to a single content file
	 */
	_optimizeSmallContent() {
		// 1. Find all small content files
		// Treat unused content files separately to avoid
		// a merge-split cycle
		/** @type {number[]} */
		const smallUsedContents = [];
		/** @type {number} */
		let smallUsedContentSize = 0;
		/** @type {number[]} */
		const smallUnusedContents = [];
		/** @type {number} */
		let smallUnusedContentSize = 0;
		for (let i = 0; i < this.content.length; i++) {
			const content = this.content[i];
			if (content === undefined) continue;
			if (content.outdated) continue;
			const size = content.getSize();
			if (size < 0 || size > MIN_CONTENT_SIZE) continue;
			if (content.used.size > 0) {
				smallUsedContents.push(i);
				smallUsedContentSize += size;
			} else {
				smallUnusedContents.push(i);
				smallUnusedContentSize += size;
			}
		}

		// 2. Check if minimum number is reached
		let mergedIndices;
		if (
			smallUsedContents.length >= CONTENT_COUNT_TO_MERGE ||
			smallUsedContentSize > MIN_CONTENT_SIZE
		) {
			mergedIndices = smallUsedContents;
		} else if (
			smallUnusedContents.length >= CONTENT_COUNT_TO_MERGE ||
			smallUnusedContentSize > MIN_CONTENT_SIZE
		) {
			mergedIndices = smallUnusedContents;
		} else return;

		const mergedContent = [];

		// 3. Remove old content entries
		for (const i of mergedIndices) {
			mergedContent.push(this.content[i]);
			this.content[i] = undefined;
		}

		// 4. Determine merged items
		/** @type {Set<string>} */
		const mergedItems = new Set();
		/** @type {Set<string>} */
		const mergedUsedItems = new Set();
		/** @type {(function(Map<string, any>): Promise)[]} */
		const addToMergedMap = [];
		for (const content of mergedContent) {
			for (const identifier of content.items) {
				mergedItems.add(identifier);
			}
			for (const identifer of content.used) {
				mergedUsedItems.add(identifer);
			}
			addToMergedMap.push(async map => {
				// unpack existing content
				// after that values are accessible in .content
				await content.unpack();
				for (const [identifier, value] of content.content) {
					map.set(identifier, value);
				}
			});
		}

		// 5. GC and update location of merged items
		const newLoc = this._findLocation();
		this._gcAndUpdateLocation(mergedItems, mergedUsedItems, newLoc);

		// 6. If not empty, store content somewhere
		if (mergedItems.size > 0) {
			this.content[newLoc] = new PackContent(
				mergedItems,
				mergedUsedItems,
				memorize(async () => {
					/** @type {Map<string, any>} */
					const map = new Map();
					await Promise.all(addToMergedMap.map(fn => fn(map)));
					return map;
				})
			);
			this.logger.log(
				"Merged %d small files with %d cache items into pack %d",
				mergedContent.length,
				mergedItems.size,
				newLoc
			);
		}
	}

	/**
	 * Split large content files with used and unused items
	 * into two parts to separate used from unused items
	 */
	_optimizeUnusedContent() {
		// 1. Find a large content file with used and unused items
		for (let i = 0; i < this.content.length; i++) {
			const content = this.content[i];
			if (content === undefined) continue;
			const size = content.getSize();
			if (size < MIN_CONTENT_SIZE) continue;
			const used = content.used.size;
			const total = content.items.size;
			if (used > 0 && used < total) {
				// 2. Remove this content
				this.content[i] = undefined;

				// 3. Determine items for the used content file
				const usedItems = new Set(content.used);
				const newLoc = this._findLocation();
				this._gcAndUpdateLocation(usedItems, usedItems, newLoc);

				// 4. Create content file for used items
				if (usedItems.size > 0) {
					this.content[newLoc] = new PackContent(
						usedItems,
						new Set(usedItems),
						async () => {
							await content.unpack();
							const map = new Map();
							for (const identifier of usedItems) {
								map.set(identifier, content.content.get(identifier));
							}
							return map;
						}
					);
				}

				// 5. Determine items for the unused content file
				const unusedItems = new Set(content.items);
				const usedOfUnusedItems = new Set();
				for (const identifier of usedItems) {
					unusedItems.delete(identifier);
				}
				const newUnusedLoc = this._findLocation();
				this._gcAndUpdateLocation(unusedItems, usedOfUnusedItems, newUnusedLoc);

				// 6. Create content file for unused items
				if (unusedItems.size > 0) {
					this.content[newUnusedLoc] = new PackContent(
						unusedItems,
						usedOfUnusedItems,
						async () => {
							await content.unpack();
							const map = new Map();
							for (const identifier of unusedItems) {
								map.set(identifier, content.content.get(identifier));
							}
							return map;
						}
					);
				}

				this.logger.log(
					"Split pack %d into pack %d with %d used items and pack %d with %d unused items",
					i,
					newLoc,
					usedItems.size,
					newUnusedLoc,
					unusedItems.size
				);

				// optimizing only one of them is good enough and
				// reduces the amount of serialization needed
				return;
			}
		}
	}

	serialize({ write, writeSeparate }) {
		this._persistFreshContent();
		this._optimizeSmallContent();
		this._optimizeUnusedContent();
		for (const identifier of this.itemInfo.keys()) {
			write(identifier);
		}
		write(null); // null as marker of the end of keys
		for (const info of this.itemInfo.values()) {
			write(info.etag);
		}
		for (const info of this.itemInfo.values()) {
			write(info.lastAccess);
		}
		for (let i = 0; i < this.content.length; i++) {
			const content = this.content[i];
			if (content !== undefined) {
				write(content.items);
				writeSeparate(content.getMap(), { name: `${i}` });
			} else {
				write(undefined); // undefined marks an empty content slot
			}
		}
		write(null); // null as marker of the end of items
	}

	deserialize({ read, logger }) {
		this.logger = logger;
		{
			const items = [];
			let item = read();
			while (item !== null) {
				items.push(item);
				item = read();
			}
			this.itemInfo.clear();
			const infoItems = items.map(identifier => {
				const info = new PackItemInfo(identifier, undefined, undefined);
				this.itemInfo.set(identifier, info);
				return info;
			});
			for (const info of infoItems) {
				info.etag = read();
			}
			for (const info of infoItems) {
				info.lastAccess = read();
			}
		}
		this.content.length = 0;
		let items = read();
		while (items !== null) {
			if (items === undefined) {
				this.content.push(items);
			} else {
				const idx = this.content.length;
				const lazy = read();
				this.content.push(
					new PackContent(
						items,
						new Set(),
						lazy,
						logger,
						`${this.content.length}`
					)
				);
				for (const identifier of items) {
					this.itemInfo.get(identifier).location = idx;
				}
			}
			items = read();
		}
	}
}

makeSerializable(Pack, "webpack/lib/cache/PackFileCacheStrategy", "Pack");

class PackContent {
	/**
	 * @param {Set<string>} items keys
	 * @param {Set<string>} usedItems used keys
	 * @param {Map<string, any> | function(): Promise<Map<string, any>>} dataOrFn sync or async content
	 * @param {Logger=} logger logger for logging
	 * @param {string=} lazyName name of dataOrFn for logging
	 */
	constructor(items, usedItems, dataOrFn, logger, lazyName) {
		this.items = items;
		/** @type {function(): Map<string, any> | Promise<Map<string, any>>} */
		this.lazy = typeof dataOrFn === "function" ? dataOrFn : undefined;
		/** @type {Map<string, any>} */
		this.content = typeof dataOrFn === "function" ? undefined : dataOrFn;
		this.outdated = false;
		this.used = usedItems;
		this.logger = logger;
		this.lazyName = lazyName;
	}

	get(identifier) {
		this.used.add(identifier);
		if (this.content) {
			return this.content.get(identifier);
		}
		const { lazyName } = this;
		if (lazyName) {
			// only log once
			this.lazyName = undefined;
			this.logger.time(`restore cache content ${lazyName}`);
		}
		const value = this.lazy();
		if (value instanceof Promise) {
			return value.then(data => {
				if (lazyName) this.logger.timeEnd(`restore cache content ${lazyName}`);
				this.content = data;
				return data.get(identifier);
			});
		} else {
			if (lazyName) this.logger.timeEnd(`restore cache content ${lazyName}`);
			this.content = value;
			return value.get(identifier);
		}
	}

	/**
	 * @returns {void | Promise} maybe a promise if lazy
	 */
	unpack() {
		if (this.content) return;
		if (this.lazy) {
			const value = this.lazy();
			if (value instanceof Promise) {
				return value.then(data => {
					this.content = data;
				});
			} else {
				this.content = value;
			}
		}
	}

	/**
	 * @returns {number} size of the content or -1 if not known
	 */
	getSize() {
		if (!this.lazy) return -1;
		const options = /** @type {any} */ (this.lazy).options;
		if (!options) return -1;
		const size = options.size;
		if (typeof size !== "number") return -1;
		return size;
	}

	delete(identifier) {
		this.items.delete(identifier);
		this.used.delete(identifier);
		this.outdated = true;
	}

	/**
	 * @returns {function(): Map<string, any> | Promise<Map<string, any>>} lazy map
	 */
	getMap() {
		if (!this.outdated && this.lazy) return this.lazy;
		if (!this.outdated && this.content) {
			const map = new Map(this.content);
			return (this.lazy = () => map);
		}
		this.outdated = false;
		if (this.content) {
			return (this.lazy = memorize(() => {
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const item of this.items) {
					map.set(item, this.content.get(item));
				}
				return map;
			}));
		}
		const lazy = this.lazy;
		return (this.lazy = () => {
			const value = lazy();
			if (value instanceof Promise) {
				return value.then(data => {
					/** @type {Map<string, any>} */
					const map = new Map();
					for (const item of this.items) {
						map.set(item, data.get(item));
					}
					return map;
				});
			} else {
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const item of this.items) {
					map.set(item, value.get(item));
				}
				return map;
			}
		});
	}
}

class PackFileCacheStrategy {
	/**
	 * @param {Object} options options
	 * @param {IntermediateFileSystem} options.fs the filesystem
	 * @param {string} options.context the context directory
	 * @param {string} options.cacheLocation the location of the cache data
	 * @param {string} options.version version identifier
	 * @param {Logger} options.logger a logger
	 * @param {Iterable<string>} options.managedPaths paths managed only by package manager
	 * @param {Iterable<string>} options.immutablePaths immutable paths
	 */
	constructor({
		fs,
		context,
		cacheLocation,
		version,
		logger,
		managedPaths,
		immutablePaths
	}) {
		this.fileSerializer = createFileSerializer(fs);
		this.fileSystemInfo = new FileSystemInfo(fs, {
			managedPaths,
			immutablePaths,
			logger: logger.getChildLogger("webpack.FileSystemInfo")
		});
		this.context = context;
		this.cacheLocation = cacheLocation;
		this.version = version;
		this.logger = logger;
		/** @type {Set<string>} */
		this.buildDependencies = new Set();
		/** @type {LazySet<string>} */
		this.newBuildDependencies = new LazySet();
		/** @type {FileSystemInfo.Snapshot} */
		this.resolveBuildDependenciesSnapshot = undefined;
		/** @type {Map<string, string>} */
		this.resolveResults = undefined;
		/** @type {FileSystemInfo.Snapshot} */
		this.buildSnapshot = undefined;
		/** @type {Promise<Pack>} */
		this.packPromise = this._openPack();
	}

	/**
	 * @returns {Promise<Pack>} the pack
	 */
	_openPack() {
		const { logger, cacheLocation, version } = this;
		/** @type {FileSystemInfo.Snapshot} */
		let buildSnapshot;
		/** @type {Set<string>} */
		let buildDependencies;
		/** @type {Set<string>} */
		let newBuildDependencies;
		/** @type {FileSystemInfo.Snapshot} */
		let resolveBuildDependenciesSnapshot;
		/** @type {Map<string, string>} */
		let resolveResults;
		logger.time("restore cache container");
		return this.fileSerializer
			.deserialize(null, {
				filename: `${cacheLocation}/index.pack`,
				extension: ".pack",
				logger
			})
			.catch(err => {
				if (err.code !== "ENOENT") {
					logger.warn(
						`Restoring pack failed from ${cacheLocation}.pack: ${err}`
					);
					logger.debug(err.stack);
				} else {
					logger.debug(`No pack exists at ${cacheLocation}.pack: ${err}`);
				}
				return undefined;
			})
			.then(packContainer => {
				logger.timeEnd("restore cache container");
				if (!packContainer) return undefined;
				if (!(packContainer instanceof PackContainer)) {
					logger.warn(
						`Restored pack from ${cacheLocation}.pack, but contained content is unexpected.`,
						packContainer
					);
					return undefined;
				}
				if (packContainer.version !== version) {
					logger.log(
						`Restored pack from ${cacheLocation}.pack, but version doesn't match.`
					);
					return undefined;
				}
				logger.time("check build dependencies");
				return Promise.all([
					new Promise((resolve, reject) => {
						this.fileSystemInfo.checkSnapshotValid(
							packContainer.buildSnapshot,
							(err, valid) => {
								if (err) {
									logger.log(
										`Restored pack from ${cacheLocation}.pack, but checking snapshot of build dependencies errored: ${err}.`
									);
									logger.debug(err.stack);
									return resolve(false);
								}
								if (!valid) {
									logger.log(
										`Restored pack from ${cacheLocation}.pack, but build dependencies have changed.`
									);
									return resolve(false);
								}
								buildSnapshot = packContainer.buildSnapshot;
								return resolve(true);
							}
						);
					}),
					new Promise((resolve, reject) => {
						this.fileSystemInfo.checkSnapshotValid(
							packContainer.resolveBuildDependenciesSnapshot,
							(err, valid) => {
								if (err) {
									logger.log(
										`Restored pack from ${cacheLocation}.pack, but checking snapshot of resolving of build dependencies errored: ${err}.`
									);
									logger.debug(err.stack);
									return resolve(false);
								}
								if (valid) {
									resolveBuildDependenciesSnapshot =
										packContainer.resolveBuildDependenciesSnapshot;
									buildDependencies = packContainer.buildDependencies;
									resolveResults = packContainer.resolveResults;
									return resolve(true);
								}
								logger.log(
									"resolving of build dependencies is invalid, will re-resolve build dependencies"
								);
								this.fileSystemInfo.checkResolveResultsValid(
									packContainer.resolveResults,
									(err, valid) => {
										if (err) {
											logger.log(
												`Restored pack from ${cacheLocation}.pack, but resolving of build dependencies errored: ${err}.`
											);
											logger.debug(err.stack);
											return resolve(false);
										}
										if (valid) {
											newBuildDependencies = packContainer.buildDependencies;
											resolveResults = packContainer.resolveResults;
											return resolve(true);
										}
										logger.log(
											`Restored pack from ${cacheLocation}.pack, but build dependencies resolve to different locations.`
										);
										return resolve(false);
									}
								);
							}
						);
					})
				])
					.catch(err => {
						logger.timeEnd("check build dependencies");
						throw err;
					})
					.then(([buildSnapshotValid, resolveValid]) => {
						logger.timeEnd("check build dependencies");
						if (buildSnapshotValid && resolveValid) {
							logger.time("restore cache content metadata");
							const d = packContainer.data();
							logger.timeEnd("restore cache content metadata");
							return d;
						}
						return undefined;
					});
			})
			.then(pack => {
				if (pack) {
					this.buildSnapshot = buildSnapshot;
					if (buildDependencies) this.buildDependencies = buildDependencies;
					if (newBuildDependencies)
						this.newBuildDependencies.addAll(newBuildDependencies);
					this.resolveResults = resolveResults;
					this.resolveBuildDependenciesSnapshot = resolveBuildDependenciesSnapshot;
					return pack;
				}
				return new Pack(logger);
			})
			.catch(err => {
				this.logger.warn(
					`Restoring pack from ${cacheLocation}.pack failed: ${err}`
				);
				this.logger.debug(err.stack);
				return new Pack(logger);
			});
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {Etag | null} etag etag of the resource
	 * @param {any} data cached content
	 * @returns {Promise<void>} promise
	 */
	store(identifier, etag, data) {
		return this.packPromise.then(pack => {
			this.logger.debug(`Cached ${identifier} to pack.`);
			pack.set(identifier, etag === null ? null : etag.toString(), data);
		});
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {Etag | null} etag etag of the resource
	 * @returns {Promise<any>} promise to the cached content
	 */
	restore(identifier, etag) {
		return this.packPromise
			.then(pack =>
				pack.get(identifier, etag === null ? null : etag.toString())
			)
			.catch(err => {
				if (err && err.code !== "ENOENT") {
					this.logger.warn(
						`Restoring failed for ${identifier} from pack: ${err}`
					);
					this.logger.debug(err.stack);
				}
			});
	}

	storeBuildDependencies(dependencies) {
		this.newBuildDependencies.addAll(dependencies);
	}

	afterAllStored() {
		return this.packPromise
			.then(pack => {
				if (!pack.invalid) return;
				this.logger.log(`Storing pack...`);
				let promise;
				const newBuildDependencies = new Set();
				for (const dep of this.newBuildDependencies) {
					if (!this.buildDependencies.has(dep)) {
						newBuildDependencies.add(dep);
						this.buildDependencies.add(dep);
					}
				}
				this.newBuildDependencies.clear();
				if (newBuildDependencies.size > 0 || !this.buildSnapshot) {
					this.logger.debug(
						`Capturing build dependencies... (${Array.from(
							newBuildDependencies
						).join(", ")})`
					);
					promise = new Promise((resolve, reject) => {
						this.logger.time("resolve build dependencies");
						this.fileSystemInfo.resolveBuildDependencies(
							this.context,
							newBuildDependencies,
							(err, result) => {
								this.logger.timeEnd("resolve build dependencies");
								if (err) return reject(err);

								this.logger.time("snapshot build dependencies");
								const {
									files,
									directories,
									missing,
									resolveResults,
									resolveDependencies
								} = result;
								if (this.resolveResults) {
									for (const [key, value] of resolveResults) {
										this.resolveResults.set(key, value);
									}
								} else {
									this.resolveResults = resolveResults;
								}
								this.fileSystemInfo.createSnapshot(
									undefined,
									resolveDependencies.files,
									resolveDependencies.directories,
									resolveDependencies.missing,
									{},
									(err, snapshot) => {
										if (err) {
											this.logger.timeEnd("snapshot build dependencies");
											return reject(err);
										}
										if (!snapshot) {
											this.logger.timeEnd("snapshot build dependencies");
											return reject(
												new Error("Unable to snapshot resolve dependencies")
											);
										}
										if (this.resolveBuildDependenciesSnapshot) {
											this.resolveBuildDependenciesSnapshot = this.fileSystemInfo.mergeSnapshots(
												this.resolveBuildDependenciesSnapshot,
												snapshot
											);
										} else {
											this.resolveBuildDependenciesSnapshot = snapshot;
										}
										this.fileSystemInfo.createSnapshot(
											undefined,
											files,
											directories,
											missing,
											{ hash: true },
											(err, snapshot) => {
												this.logger.timeEnd("snapshot build dependencies");
												if (err) return reject(err);
												if (!snapshot) {
													return reject(
														new Error("Unable to snapshot build dependencies")
													);
												}
												this.logger.debug("Captured build dependencies");

												if (this.buildSnapshot) {
													this.buildSnapshot = this.fileSystemInfo.mergeSnapshots(
														this.buildSnapshot,
														snapshot
													);
												} else {
													this.buildSnapshot = snapshot;
												}

												resolve();
											}
										);
									}
								);
							}
						);
					});
				} else {
					promise = Promise.resolve();
				}
				return promise.then(() => {
					this.logger.time(`store pack`);
					const content = new PackContainer(
						pack,
						this.version,
						this.buildSnapshot,
						this.buildDependencies,
						this.resolveResults,
						this.resolveBuildDependenciesSnapshot
					);
					// You might think this breaks all access to the existing pack
					// which are still referenced, but serializing the pack memorizes
					// all data in the pack and makes it no longer need the backing file
					// So it's safe to replace the pack file
					return this.fileSerializer
						.serialize(content, {
							filename: `${this.cacheLocation}/index.pack`,
							extension: ".pack",
							logger: this.logger
						})
						.then(() => {
							this.logger.timeEnd(`store pack`);
							this.logger.log(`Stored pack`);
						})
						.catch(err => {
							this.logger.timeEnd(`store pack`);
							this.logger.warn(`Caching failed for pack: ${err}`);
							this.logger.debug(err.stack);
						});
				});
			})
			.catch(err => {
				this.logger.warn(`Caching failed for pack: ${err}`);
				this.logger.debug(err.stack);
			});
	}
}

module.exports = PackFileCacheStrategy;
