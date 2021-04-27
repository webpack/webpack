/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FileSystemInfo = require("../FileSystemInfo");
const ProgressPlugin = require("../ProgressPlugin");
const { formatSize } = require("../SizeFormatHelpers");
const LazySet = require("../util/LazySet");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const {
	createFileSerializer,
	NOT_SERIALIZABLE
} = require("../util/serialization");

/** @typedef {import("../../declarations/WebpackOptions").SnapshotOptions} SnapshotOptions */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo").Snapshot} Snapshot */
/** @typedef {import("../logging/Logger").Logger} Logger */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

class PackContainer {
	/**
	 * @param {Object} data stored data
	 * @param {string} version version identifier
	 * @param {Snapshot} buildSnapshot snapshot of all build dependencies
	 * @param {Set<string>} buildDependencies list of all unresolved build dependencies captured
	 * @param {Map<string, string | false>} resolveResults result of the resolved build dependencies
	 * @param {Snapshot} resolveBuildDependenciesSnapshot snapshot of the dependencies of the build dependencies resolving
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
const MAX_ITEMS_IN_FRESH_PACK = 50000;

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
	constructor(logger, maxAge) {
		/** @type {Map<string, PackItemInfo>} */
		this.itemInfo = new Map();
		/** @type {string[]} */
		this.requests = [];
		/** @type {Map<string, PackItemInfo>} */
		this.freshContent = new Map();
		/** @type {(undefined | PackContent)[]} */
		this.content = [];
		this.invalid = false;
		this.logger = logger;
		this.maxAge = maxAge;
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {string | null} etag etag of the resource
	 * @returns {any} cached content
	 */
	get(identifier, etag) {
		const info = this.itemInfo.get(identifier);
		this.requests.push(identifier);
		if (info === undefined) {
			return undefined;
		}
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
			this.logger.log(`Pack got invalid because of write to: ${identifier}`);
		}
		const info = this.itemInfo.get(identifier);
		if (info === undefined) {
			const newInfo = new PackItemInfo(identifier, etag, data);
			this.itemInfo.set(identifier, newInfo);
			this.requests.push(identifier);
			this.freshContent.set(identifier, newInfo);
		} else {
			const loc = info.location;
			if (loc >= 0) {
				this.requests.push(identifier);
				this.freshContent.set(identifier, info);
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

	getContentStats() {
		let count = 0;
		let size = 0;
		for (const content of this.content) {
			if (content !== undefined) {
				count++;
				const s = content.getSize();
				if (s > 0) {
					size += s;
				}
			}
		}
		return { count, size };
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
			if (now - info.lastAccess > this.maxAge) {
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
				"Garbage Collected %d old items at pack %d (%d items remaining) e. g. %s",
				count,
				newLoc,
				items.size,
				lastGC
			);
		}
	}

	_persistFreshContent() {
		if (this.freshContent.size > 0) {
			const packCount = Math.ceil(
				this.freshContent.size / MAX_ITEMS_IN_FRESH_PACK
			);
			const itemsPerPack = Math.ceil(this.freshContent.size / packCount);
			this.logger.log(`${this.freshContent.size} fresh items in cache`);
			const packs = Array.from({ length: packCount }, () => {
				const loc = this._findLocation();
				this.content[loc] = null; // reserve
				return {
					/** @type {Set<string>} */
					items: new Set(),
					/** @type {Map<string, any>} */
					map: new Map(),
					loc
				};
			});
			let i = 0;
			let pack = packs[0];
			let packIndex = 0;
			for (const identifier of this.requests) {
				const info = this.freshContent.get(identifier);
				if (info === undefined) continue;
				pack.items.add(identifier);
				pack.map.set(identifier, info.freshValue);
				info.location = pack.loc;
				info.freshValue = undefined;
				this.freshContent.delete(identifier);
				if (++i > itemsPerPack) {
					i = 0;
					pack = packs[++packIndex];
				}
			}
			for (const pack of packs) {
				this.content[pack.loc] = new PackContent(
					pack.items,
					new Set(pack.items),
					new PackContentItems(pack.map)
				);
			}
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
				memoize(async () => {
					/** @type {Map<string, any>} */
					const map = new Map();
					await Promise.all(addToMergedMap.map(fn => fn(map)));
					return new PackContentItems(map);
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
							return new PackContentItems(map);
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
							return new PackContentItems(map);
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

	/**
	 * Find the content with the oldest item and run GC on that.
	 * Only runs for one content to avoid large invalidation.
	 */
	_gcOldestContent() {
		/** @type {PackItemInfo} */
		let oldest = undefined;
		for (const info of this.itemInfo.values()) {
			if (oldest === undefined || info.lastAccess < oldest.lastAccess) {
				oldest = info;
			}
		}
		if (Date.now() - oldest.lastAccess > this.maxAge) {
			const loc = oldest.location;
			if (loc < 0) return;
			const content = this.content[loc];
			const items = new Set(content.items);
			const usedItems = new Set(content.used);
			this._gcAndUpdateLocation(items, usedItems, loc);

			this.content[loc] =
				items.size > 0
					? new PackContent(items, usedItems, async () => {
							await content.unpack();
							const map = new Map();
							for (const identifier of items) {
								map.set(identifier, content.content.get(identifier));
							}
							return new PackContentItems(map);
					  })
					: undefined;
		}
	}

	serialize({ write, writeSeparate }) {
		this._persistFreshContent();
		this._optimizeSmallContent();
		this._optimizeUnusedContent();
		this._gcOldestContent();
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
				writeSeparate(content.getLazyContentItems(), { name: `${i}` });
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

class PackContentItems {
	/**
	 * @param {Map<string, any>} map items
	 */
	constructor(map) {
		this.map = map;
	}

	serialize({ write, snapshot, rollback, logger, profile }) {
		if (profile) {
			write(false);
			for (const [key, value] of this.map) {
				const s = snapshot();
				try {
					write(key);
					const start = process.hrtime();
					write(value);
					const durationHr = process.hrtime(start);
					const duration = durationHr[0] * 1000 + durationHr[1] / 1e6;
					if (duration > 1) {
						if (duration > 500)
							logger.error(`Serialization of '${key}': ${duration} ms`);
						else if (duration > 50)
							logger.warn(`Serialization of '${key}': ${duration} ms`);
						else if (duration > 10)
							logger.info(`Serialization of '${key}': ${duration} ms`);
						else if (duration > 5)
							logger.log(`Serialization of '${key}': ${duration} ms`);
						else logger.debug(`Serialization of '${key}': ${duration} ms`);
					}
				} catch (e) {
					rollback(s);
					if (e === NOT_SERIALIZABLE) continue;
					logger.warn(
						`Skipped not serializable cache item '${key}': ${e.message}`
					);
					logger.debug(e.stack);
				}
			}
			write(null);
			return;
		}
		// Try to serialize all at once
		const s = snapshot();
		try {
			write(true);
			write(this.map);
		} catch (e) {
			rollback(s);

			// Try to serialize each item on it's own
			write(false);
			for (const [key, value] of this.map) {
				const s = snapshot();
				try {
					write(key);
					write(value);
				} catch (e) {
					rollback(s);
					if (e === NOT_SERIALIZABLE) continue;
					logger.warn(
						`Skipped not serializable cache item '${key}': ${e.message}`
					);
					logger.debug(e.stack);
				}
			}
			write(null);
		}
	}

	deserialize({ read, logger, profile }) {
		if (read()) {
			this.map = read();
		} else if (profile) {
			const map = new Map();
			let key = read();
			while (key !== null) {
				const start = process.hrtime();
				const value = read();
				const durationHr = process.hrtime(start);
				const duration = durationHr[0] * 1000 + durationHr[1] / 1e6;
				if (duration > 1) {
					if (duration > 100)
						logger.error(`Deserialization of '${key}': ${duration} ms`);
					else if (duration > 20)
						logger.warn(`Deserialization of '${key}': ${duration} ms`);
					else if (duration > 5)
						logger.info(`Deserialization of '${key}': ${duration} ms`);
					else if (duration > 2)
						logger.log(`Deserialization of '${key}': ${duration} ms`);
					else logger.debug(`Deserialization of '${key}': ${duration} ms`);
				}
				map.set(key, value);
				key = read();
			}
			this.map = map;
		} else {
			const map = new Map();
			let key = read();
			while (key !== null) {
				map.set(key, read());
				key = read();
			}
			this.map = map;
		}
	}
}

makeSerializable(
	PackContentItems,
	"webpack/lib/cache/PackFileCacheStrategy",
	"PackContentItems"
);

class PackContent {
	/**
	 * @param {Set<string>} items keys
	 * @param {Set<string>} usedItems used keys
	 * @param {PackContentItems | function(): Promise<PackContentItems>} dataOrFn sync or async content
	 * @param {Logger=} logger logger for logging
	 * @param {string=} lazyName name of dataOrFn for logging
	 */
	constructor(items, usedItems, dataOrFn, logger, lazyName) {
		this.items = items;
		/** @type {function(): PackContentItems | Promise<PackContentItems>} */
		this.lazy = typeof dataOrFn === "function" ? dataOrFn : undefined;
		/** @type {Map<string, any>} */
		this.content = typeof dataOrFn === "function" ? undefined : dataOrFn.map;
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
		let timeMessage;
		if (lazyName) {
			// only log once
			this.lazyName = undefined;
			timeMessage = `restore cache content ${lazyName} (${formatSize(
				this.getSize()
			)})`;
			this.logger.log(
				`starting to restore cache content ${lazyName} (${formatSize(
					this.getSize()
				)}) because of request to: ${identifier}`
			);
			this.logger.time(timeMessage);
		}
		const value = this.lazy();
		if (value instanceof Promise) {
			return value.then(data => {
				const map = data.map;
				if (timeMessage) {
					this.logger.timeEnd(timeMessage);
				}
				this.content = map;
				return map.get(identifier);
			});
		} else {
			const map = value.map;
			if (timeMessage) {
				this.logger.timeEnd(timeMessage);
			}
			this.content = map;
			return map.get(identifier);
		}
	}

	/**
	 * @returns {void | Promise} maybe a promise if lazy
	 */
	unpack() {
		if (this.content) return;
		if (this.lazy) {
			const { lazyName } = this;
			let timeMessage;
			if (lazyName) {
				// only log once
				this.lazyName = undefined;
				timeMessage = `unpack cache content ${lazyName} (${formatSize(
					this.getSize()
				)})`;
				this.logger.time(timeMessage);
			}
			const value = this.lazy();
			if (value instanceof Promise) {
				return value.then(data => {
					if (timeMessage) {
						this.logger.timeEnd(timeMessage);
					}
					this.content = data.map;
				});
			} else {
				if (timeMessage) {
					this.logger.timeEnd(timeMessage);
				}
				this.content = value.map;
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
	 * @returns {function(): PackContentItems | Promise<PackContentItems>} lazy content items
	 */
	getLazyContentItems() {
		if (!this.outdated && this.lazy) return this.lazy;
		if (!this.outdated && this.content) {
			const map = new Map(this.content);
			return (this.lazy = memoize(() => new PackContentItems(map)));
		}
		this.outdated = false;
		if (this.content) {
			return (this.lazy = memoize(() => {
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const item of this.items) {
					map.set(item, this.content.get(item));
				}
				return new PackContentItems(map);
			}));
		}
		const lazy = this.lazy;
		return (this.lazy = () => {
			const value = lazy();
			if (value instanceof Promise) {
				return value.then(data => {
					const oldMap = data.map;
					/** @type {Map<string, any>} */
					const map = new Map();
					for (const item of this.items) {
						map.set(item, oldMap.get(item));
					}
					return new PackContentItems(map);
				});
			} else {
				const oldMap = value.map;
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const item of this.items) {
					map.set(item, oldMap.get(item));
				}
				return new PackContentItems(map);
			}
		});
	}
}

const allowCollectingMemory = buf => {
	const wasted = buf.buffer.byteLength - buf.byteLength;
	if (wasted > 8192 && (wasted > 1048576 || wasted > buf.byteLength)) {
		return Buffer.from(buf);
	}
	return buf;
};

class PackFileCacheStrategy {
	/**
	 * @param {Object} options options
	 * @param {Compiler} options.compiler the compiler
	 * @param {IntermediateFileSystem} options.fs the filesystem
	 * @param {string} options.context the context directory
	 * @param {string} options.cacheLocation the location of the cache data
	 * @param {string} options.version version identifier
	 * @param {Logger} options.logger a logger
	 * @param {SnapshotOptions} options.snapshot options regarding snapshotting
	 * @param {number} options.maxAge max age of cache items
	 * @param {boolean} options.profile track and log detailed timing information for individual cache items
	 * @param {boolean} options.allowCollectingMemory allow to collect unused memory created during deserialization
	 */
	constructor({
		compiler,
		fs,
		context,
		cacheLocation,
		version,
		logger,
		snapshot,
		maxAge,
		profile,
		allowCollectingMemory
	}) {
		this.fileSerializer = createFileSerializer(fs);
		this.fileSystemInfo = new FileSystemInfo(fs, {
			managedPaths: snapshot.managedPaths,
			immutablePaths: snapshot.immutablePaths,
			logger: logger.getChildLogger("webpack.FileSystemInfo")
		});
		this.compiler = compiler;
		this.context = context;
		this.cacheLocation = cacheLocation;
		this.version = version;
		this.logger = logger;
		this.maxAge = maxAge;
		this.profile = profile;
		this.allowCollectingMemory = allowCollectingMemory;
		this.snapshot = snapshot;
		/** @type {Set<string>} */
		this.buildDependencies = new Set();
		/** @type {LazySet<string>} */
		this.newBuildDependencies = new LazySet();
		/** @type {Snapshot} */
		this.resolveBuildDependenciesSnapshot = undefined;
		/** @type {Map<string, string | false>} */
		this.resolveResults = undefined;
		/** @type {Snapshot} */
		this.buildSnapshot = undefined;
		/** @type {Promise<Pack>} */
		this.packPromise = this._openPack();
		this.storePromise = Promise.resolve();
	}

	_getPack() {
		if (this.packPromise === undefined) {
			this.packPromise = this.storePromise.then(() => this._openPack());
		}
		return this.packPromise;
	}

	/**
	 * @returns {Promise<Pack>} the pack
	 */
	_openPack() {
		const { logger, profile, cacheLocation, version } = this;
		/** @type {Snapshot} */
		let buildSnapshot;
		/** @type {Set<string>} */
		let buildDependencies;
		/** @type {Set<string>} */
		let newBuildDependencies;
		/** @type {Snapshot} */
		let resolveBuildDependenciesSnapshot;
		/** @type {Map<string, string | false>} */
		let resolveResults;
		logger.time("restore cache container");
		return this.fileSerializer
			.deserialize(null, {
				filename: `${cacheLocation}/index.pack`,
				extension: ".pack",
				logger,
				profile,
				retainedBuffer: this.allowCollectingMemory
					? allowCollectingMemory
					: undefined
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
					pack.maxAge = this.maxAge;
					this.buildSnapshot = buildSnapshot;
					if (buildDependencies) this.buildDependencies = buildDependencies;
					if (newBuildDependencies)
						this.newBuildDependencies.addAll(newBuildDependencies);
					this.resolveResults = resolveResults;
					this.resolveBuildDependenciesSnapshot = resolveBuildDependenciesSnapshot;
					return pack;
				}
				return new Pack(logger, this.maxAge);
			})
			.catch(err => {
				this.logger.warn(
					`Restoring pack from ${cacheLocation}.pack failed: ${err}`
				);
				this.logger.debug(err.stack);
				return new Pack(logger, this.maxAge);
			});
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {Etag | null} etag etag of the resource
	 * @param {any} data cached content
	 * @returns {Promise<void>} promise
	 */
	store(identifier, etag, data) {
		return this._getPack().then(pack => {
			pack.set(identifier, etag === null ? null : etag.toString(), data);
		});
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {Etag | null} etag etag of the resource
	 * @returns {Promise<any>} promise to the cached content
	 */
	restore(identifier, etag) {
		return this._getPack()
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
		const packPromise = this.packPromise;
		if (packPromise === undefined) return Promise.resolve();
		const reportProgress = ProgressPlugin.getReporter(this.compiler);
		this.packPromise = undefined;
		return (this.storePromise = packPromise
			.then(pack => {
				if (!pack.invalid) return;
				this.logger.log(`Storing pack...`);
				let promise;
				const newBuildDependencies = new Set();
				for (const dep of this.newBuildDependencies) {
					if (!this.buildDependencies.has(dep)) {
						newBuildDependencies.add(dep);
					}
				}
				if (newBuildDependencies.size > 0 || !this.buildSnapshot) {
					if (reportProgress) reportProgress(0.5, "resolve build dependencies");
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
								if (reportProgress) {
									reportProgress(
										0.6,
										"snapshot build dependencies",
										"resolving"
									);
								}
								this.fileSystemInfo.createSnapshot(
									undefined,
									resolveDependencies.files,
									resolveDependencies.directories,
									resolveDependencies.missing,
									this.snapshot.resolveBuildDependencies,
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
										if (reportProgress) {
											reportProgress(
												0.7,
												"snapshot build dependencies",
												"modules"
											);
										}
										this.fileSystemInfo.createSnapshot(
											undefined,
											files,
											directories,
											missing,
											this.snapshot.buildDependencies,
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
					if (reportProgress) reportProgress(0.8, "serialize pack");
					this.logger.time(`store pack`);
					const updatedBuildDependencies = new Set(this.buildDependencies);
					for (const dep of newBuildDependencies) {
						updatedBuildDependencies.add(dep);
					}
					const content = new PackContainer(
						pack,
						this.version,
						this.buildSnapshot,
						updatedBuildDependencies,
						this.resolveResults,
						this.resolveBuildDependenciesSnapshot
					);
					return this.fileSerializer
						.serialize(content, {
							filename: `${this.cacheLocation}/index.pack`,
							extension: ".pack",
							logger: this.logger,
							profile: this.profile
						})
						.then(() => {
							for (const dep of newBuildDependencies) {
								this.buildDependencies.add(dep);
							}
							this.newBuildDependencies.clear();
							this.logger.timeEnd(`store pack`);
							const stats = pack.getContentStats();
							this.logger.log(
								"Stored pack (%d items, %d files, %d MiB)",
								pack.itemInfo.size,
								stats.count,
								Math.round(stats.size / 1024 / 1024)
							);
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
			}));
	}

	clear() {
		this.fileSystemInfo.clear();
		this.buildDependencies.clear();
		this.newBuildDependencies.clear();
		this.resolveBuildDependenciesSnapshot = undefined;
		this.resolveResults = undefined;
		this.buildSnapshot = undefined;
		this.packPromise = undefined;
	}
}

module.exports = PackFileCacheStrategy;
