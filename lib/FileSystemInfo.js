/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { create: createResolver } = require("enhanced-resolve");
const asyncLib = require("neo-async");
const AsyncQueue = require("./util/AsyncQueue");
const createHash = require("./util/createHash");
const { join, dirname, relative } = require("./util/fs");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const supportsEsm = +process.versions.modules >= 83;

const resolveContext = createResolver({
	resolveToContext: true,
	exportsFields: []
});
const resolve = createResolver({
	extensions: [".js", ".json", ".node"],
	conditionNames: ["require"]
});

let FS_ACCURACY = 2000;

const EMPTY_SET = new Set();

const RBDT_RESOLVE = 0;
const RBDT_RESOLVE_DIRECTORY = 1;
const RBDT_RESOLVE_FILE = 2;
const RBDT_DIRECTORY = 3;
const RBDT_FILE = 4;
const RBDT_DIRECTORY_DEPENDENCIES = 5;
const RBDT_FILE_DEPENDENCIES = 6;

const INVALID = Symbol("invalid");

/**
 * @typedef {Object} FileSystemInfoEntry
 * @property {number} safeTime
 * @property {number=} timestamp
 * @property {string=} timestampHash
 */

/**
 * @typedef {Object} TimestampAndHash
 * @property {number} safeTime
 * @property {number=} timestamp
 * @property {string=} timestampHash
 * @property {string} hash
 */

/**
 * @typedef {Object} SnapshotOptimizationEntry
 * @property {Snapshot} snapshot
 * @property {number} shared
 * @property {Set<string>} snapshotContent
 * @property {Set<SnapshotOptimizationEntry>} children
 */

/**
 * @typedef {Object} ResolveBuildDependenciesResult
 * @property {Set<string>} files list of files
 * @property {Set<string>} directories list of directories
 * @property {Set<string>} missing list of missing entries
 * @property {Map<string, string>} resolveResults stored resolve results
 * @property {Object} resolveDependencies dependencies of the resolving
 * @property {Set<string>} resolveDependencies.files list of files
 * @property {Set<string>} resolveDependencies.directories list of directories
 * @property {Set<string>} resolveDependencies.missing list of missing entries
 */

const DONE_ITERATOR_RESULT = new Set().keys().next();

// cspell:word tshs
// Tsh = Timestamp + Hash
// Tshs = Timestamp + Hash combinations

class Snapshot {
	constructor() {
		this._flags = 0;
		/** @type {number | undefined} */
		this.startTime = undefined;
		/** @type {Map<string, FileSystemInfoEntry> | undefined} */
		this.fileTimestamps = undefined;
		/** @type {Map<string, string> | undefined} */
		this.fileHashes = undefined;
		/** @type {Map<string, TimestampAndHash | string> | undefined} */
		this.fileTshs = undefined;
		/** @type {Map<string, FileSystemInfoEntry> | undefined} */
		this.contextTimestamps = undefined;
		/** @type {Map<string, string> | undefined} */
		this.contextHashes = undefined;
		/** @type {Map<string, TimestampAndHash | string> | undefined} */
		this.contextTshs = undefined;
		/** @type {Map<string, boolean> | undefined} */
		this.missingExistence = undefined;
		/** @type {Map<string, string> | undefined} */
		this.managedItemInfo = undefined;
		/** @type {Set<string> | undefined} */
		this.managedFiles = undefined;
		/** @type {Set<string> | undefined} */
		this.managedContexts = undefined;
		/** @type {Set<string> | undefined} */
		this.managedMissing = undefined;
		/** @type {Set<Snapshot> | undefined} */
		this.children = undefined;
	}

	hasStartTime() {
		return (this._flags & 1) !== 0;
	}

	setStartTime(value) {
		this._flags = this._flags | 1;
		this.startTime = value;
	}

	setMergedStartTime(value, snapshot) {
		if (value) {
			if (snapshot.hasStartTime()) {
				this.setStartTime(Math.min(value, snapshot.startTime));
			} else {
				this.setStartTime(value);
			}
		} else {
			if (snapshot.hasStartTime()) this.setStartTime(snapshot.startTime);
		}
	}

	hasFileTimestamps() {
		return (this._flags & 2) !== 0;
	}

	setFileTimestamps(value) {
		this._flags = this._flags | 2;
		this.fileTimestamps = value;
	}

	hasFileHashes() {
		return (this._flags & 4) !== 0;
	}

	setFileHashes(value) {
		this._flags = this._flags | 4;
		this.fileHashes = value;
	}

	hasFileTshs() {
		return (this._flags & 8) !== 0;
	}

	setFileTshs(value) {
		this._flags = this._flags | 8;
		this.fileTshs = value;
	}

	hasContextTimestamps() {
		return (this._flags & 0x10) !== 0;
	}

	setContextTimestamps(value) {
		this._flags = this._flags | 0x10;
		this.contextTimestamps = value;
	}

	hasContextHashes() {
		return (this._flags & 0x20) !== 0;
	}

	setContextHashes(value) {
		this._flags = this._flags | 0x20;
		this.contextHashes = value;
	}

	hasContextTshs() {
		return (this._flags & 0x40) !== 0;
	}

	setContextTshs(value) {
		this._flags = this._flags | 0x40;
		this.contextTshs = value;
	}

	hasMissingExistence() {
		return (this._flags & 0x80) !== 0;
	}

	setMissingExistence(value) {
		this._flags = this._flags | 0x80;
		this.missingExistence = value;
	}

	hasManagedItemInfo() {
		return (this._flags & 0x100) !== 0;
	}

	setManagedItemInfo(value) {
		this._flags = this._flags | 0x100;
		this.managedItemInfo = value;
	}

	hasManagedFiles() {
		return (this._flags & 0x200) !== 0;
	}

	setManagedFiles(value) {
		this._flags = this._flags | 0x200;
		this.managedFiles = value;
	}

	hasManagedContexts() {
		return (this._flags & 0x400) !== 0;
	}

	setManagedContexts(value) {
		this._flags = this._flags | 0x400;
		this.managedContexts = value;
	}

	hasManagedMissing() {
		return (this._flags & 0x800) !== 0;
	}

	setManagedMissing(value) {
		this._flags = this._flags | 0x800;
		this.managedMissing = value;
	}

	hasChildren() {
		return (this._flags & 0x1000) !== 0;
	}

	setChildren(value) {
		this._flags = this._flags | 0x1000;
		this.children = value;
	}

	addChild(child) {
		if (!this.hasChildren()) {
			this.setChildren(new Set());
		}
		this.children.add(child);
	}

	serialize({ write }) {
		write(this._flags);
		if (this.hasStartTime()) write(this.startTime);
		if (this.hasFileTimestamps()) write(this.fileTimestamps);
		if (this.hasFileHashes()) write(this.fileHashes);
		if (this.hasFileTshs()) write(this.fileTshs);
		if (this.hasContextTimestamps()) write(this.contextTimestamps);
		if (this.hasContextHashes()) write(this.contextHashes);
		if (this.hasContextTshs()) write(this.contextTshs);
		if (this.hasMissingExistence()) write(this.missingExistence);
		if (this.hasManagedItemInfo()) write(this.managedItemInfo);
		if (this.hasManagedFiles()) write(this.managedFiles);
		if (this.hasManagedContexts()) write(this.managedContexts);
		if (this.hasManagedMissing()) write(this.managedMissing);
		if (this.hasChildren()) write(this.children);
	}

	deserialize({ read }) {
		this._flags = read();
		if (this.hasStartTime()) this.startTime = read();
		if (this.hasFileTimestamps()) this.fileTimestamps = read();
		if (this.hasFileHashes()) this.fileHashes = read();
		if (this.hasFileTshs()) this.fileTshs = read();
		if (this.hasContextTimestamps()) this.contextTimestamps = read();
		if (this.hasContextHashes()) this.contextHashes = read();
		if (this.hasContextTshs()) this.contextTshs = read();
		if (this.hasMissingExistence()) this.missingExistence = read();
		if (this.hasManagedItemInfo()) this.managedItemInfo = read();
		if (this.hasManagedFiles()) this.managedFiles = read();
		if (this.hasManagedContexts()) this.managedContexts = read();
		if (this.hasManagedMissing()) this.managedMissing = read();
		if (this.hasChildren()) this.children = read();
	}

	/**
	 * @param {function(Snapshot): (Map<string, any> | Set<string>)[]} getMaps first
	 * @returns {Iterable<string>} iterable
	 */
	_createIterable(getMaps) {
		let snapshot = this;
		return {
			[Symbol.iterator]() {
				let state = 0;
				/** @type {IterableIterator<string>} */
				let it;
				let maps = getMaps(snapshot);
				const queue = [];
				return {
					next() {
						for (;;) {
							switch (state) {
								case 0:
									if (maps.length > 0) {
										const map = maps.pop();
										if (map !== undefined) {
											it = map.keys();
											state = 1;
										} else {
											break;
										}
									} else {
										state = 2;
										break;
									}
								/* falls through */
								case 1: {
									const result = it.next();
									if (!result.done) return result;
									state = 0;
									break;
								}
								case 2: {
									const children = snapshot.children;
									if (children !== undefined) {
										for (const child of children) {
											queue.push(child);
										}
									}
									if (queue.length > 0) {
										snapshot = queue.pop();
										maps = getMaps(snapshot);
										state = 0;
										break;
									} else {
										state = 3;
									}
								}
								/* falls through */
								case 3:
									return DONE_ITERATOR_RESULT;
							}
						}
					}
				};
			}
		};
	}

	/**
	 * @returns {Iterable<string>} iterable
	 */
	getFileIterable() {
		return this._createIterable(s => [
			s.fileTimestamps,
			s.fileHashes,
			s.fileTshs,
			s.managedFiles
		]);
	}

	/**
	 * @returns {Iterable<string>} iterable
	 */
	getContextIterable() {
		return this._createIterable(s => [
			s.contextTimestamps,
			s.contextHashes,
			s.contextTshs,
			s.managedContexts
		]);
	}

	/**
	 * @returns {Iterable<string>} iterable
	 */
	getMissingIterable() {
		return this._createIterable(s => [s.missingExistence, s.managedMissing]);
	}
}

makeSerializable(Snapshot, "webpack/lib/FileSystemInfo", "Snapshot");

const MIN_COMMON_SNAPSHOT_SIZE = 3;

/**
 * @template T
 */
class SnapshotOptimization {
	/**
	 * @param {function(Snapshot): boolean} has has value
	 * @param {function(Snapshot): Map<string, T> | Set<string>} get get value
	 * @param {function(Snapshot, Map<string, T> | Set<string>): void} set set value
	 * @param {boolean=} isSet value is an Set instead of a Map
	 */
	constructor(has, get, set, isSet = false) {
		this._has = has;
		this._get = get;
		this._set = set;
		this._isSet = isSet;
		/** @type {Map<string, SnapshotOptimizationEntry>} */
		this._map = new Map();
		this._statItemsShared = 0;
		this._statItemsUnshared = 0;
		this._statSharedSnapshots = 0;
		this._statReusedSharedSnapshots = 0;
	}

	getStatisticMessage() {
		const total = this._statItemsShared + this._statItemsUnshared;
		if (total === 0) return undefined;
		return `${
			this._statItemsShared && Math.round((this._statItemsShared * 100) / total)
		}% (${this._statItemsShared}/${total}) entries shared via ${
			this._statSharedSnapshots
		} shared snapshots (${
			this._statReusedSharedSnapshots + this._statSharedSnapshots
		} times referenced)`;
	}

	storeUnsharedSnapshot(snapshot, locations) {
		if (locations === undefined) return;
		const optimizationEntry = {
			snapshot,
			shared: 0,
			snapshotContent: undefined,
			children: undefined
		};
		for (const path of locations) {
			this._map.set(path, optimizationEntry);
		}
	}

	optimize(capturedFiles, startTime, children) {
		/** @type {Set<string>} */
		const unsetOptimizationEntries = new Set();
		/** @type {Set<SnapshotOptimizationEntry>} */
		const checkedOptimizationEntries = new Set();
		/**
		 * @param {SnapshotOptimizationEntry} entry optimization entry
		 * @returns {void}
		 */
		const increaseSharedAndStoreOptimizationEntry = entry => {
			if (entry.children !== undefined) {
				entry.children.forEach(increaseSharedAndStoreOptimizationEntry);
			}
			entry.shared++;
			storeOptimizationEntry(entry);
		};
		/**
		 * @param {SnapshotOptimizationEntry} entry optimization entry
		 * @returns {void}
		 */
		const storeOptimizationEntry = entry => {
			for (const path of entry.snapshotContent) {
				const old = this._map.get(path);
				if (old.shared < entry.shared) {
					this._map.set(path, entry);
				}
				capturedFiles.delete(path);
			}
		};
		const capturedFilesSize = capturedFiles.size;
		capturedFiles: for (const path of capturedFiles) {
			const optimizationEntry = this._map.get(path);
			if (optimizationEntry === undefined) {
				unsetOptimizationEntries.add(path);
				continue;
			}
			if (checkedOptimizationEntries.has(optimizationEntry)) continue;
			const snapshot = optimizationEntry.snapshot;
			if (optimizationEntry.shared > 0) {
				// It's a shared snapshot
				// We can't change it, so we can only use it when all files match
				// and startTime is compatible
				if (
					startTime &&
					(!snapshot.startTime || snapshot.startTime > startTime)
				) {
					continue;
				}
				const nonSharedFiles = new Set();
				const snapshotContent = optimizationEntry.snapshotContent;
				const snapshotEntries = this._get(snapshot);
				for (const path of snapshotContent) {
					if (!capturedFiles.has(path)) {
						if (!snapshotEntries.has(path)) {
							// File is not shared and can't be removed from the snapshot
							// because it's in a child of the snapshot
							checkedOptimizationEntries.add(optimizationEntry);
							continue capturedFiles;
						}
						nonSharedFiles.add(path);
						continue;
					}
				}
				if (nonSharedFiles.size === 0) {
					// The complete snapshot is shared
					// add it as child
					children.add(snapshot);
					increaseSharedAndStoreOptimizationEntry(optimizationEntry);
					this._statReusedSharedSnapshots++;
				} else {
					// Only a part of the snapshot is shared
					const sharedCount = snapshotContent.size - nonSharedFiles.size;
					if (sharedCount < MIN_COMMON_SNAPSHOT_SIZE) {
						// Common part it too small
						checkedOptimizationEntries.add(optimizationEntry);
						continue capturedFiles;
					}
					// Extract common timestamps from both snapshots
					let commonMap;
					if (this._isSet) {
						commonMap = new Set();
						for (const path of /** @type {Set<string>} */ (snapshotEntries)) {
							if (nonSharedFiles.has(path)) continue;
							commonMap.add(path);
							snapshotEntries.delete(path);
						}
					} else {
						commonMap = new Map();
						const map = /** @type {Map<string, T>} */ (snapshotEntries);
						for (const [path, value] of map) {
							if (nonSharedFiles.has(path)) continue;
							commonMap.set(path, value);
							snapshotEntries.delete(path);
						}
					}
					// Create and attach snapshot
					const commonSnapshot = new Snapshot();
					commonSnapshot.setMergedStartTime(startTime, snapshot);
					this._set(commonSnapshot, commonMap);
					children.add(commonSnapshot);
					snapshot.addChild(commonSnapshot);
					// Create optimization entry
					const newEntry = {
						snapshot: commonSnapshot,
						shared: optimizationEntry.shared + 1,
						snapshotContent: new Set(commonMap.keys()),
						children: undefined
					};
					if (optimizationEntry.children === undefined)
						optimizationEntry.children = new Set();
					optimizationEntry.children.add(newEntry);
					storeOptimizationEntry(newEntry);
					this._statSharedSnapshots++;
				}
			} else {
				// It's a unshared snapshot
				// We can extract a common shared snapshot
				// with all common files
				const snapshotEntries = this._get(snapshot);
				let commonMap;
				if (this._isSet) {
					commonMap = new Set();
					const set = /** @type {Set<string>} */ (snapshotEntries);
					if (capturedFiles.size < set.size) {
						for (const path of capturedFiles) {
							if (set.has(path)) commonMap.add(path);
						}
					} else {
						for (const path of set) {
							if (capturedFiles.has(path)) commonMap.add(path);
						}
					}
				} else {
					commonMap = new Map();
					const map = /** @type {Map<string, T>} */ (snapshotEntries);
					for (const path of capturedFiles) {
						const ts = map.get(path);
						if (ts === undefined) continue;
						commonMap.set(path, ts);
					}
				}

				if (commonMap.size < MIN_COMMON_SNAPSHOT_SIZE) {
					// Common part it too small
					checkedOptimizationEntries.add(optimizationEntry);
					continue capturedFiles;
				}
				// Create and attach snapshot
				const commonSnapshot = new Snapshot();
				commonSnapshot.setMergedStartTime(startTime, snapshot);
				this._set(commonSnapshot, commonMap);
				children.add(commonSnapshot);
				snapshot.addChild(commonSnapshot);
				// Remove files from snapshot
				for (const path of commonMap.keys()) snapshotEntries.delete(path);
				const sharedCount = commonMap.size;
				this._statItemsUnshared -= sharedCount;
				this._statItemsShared += sharedCount;
				// Create optimization entry
				storeOptimizationEntry({
					snapshot: commonSnapshot,
					shared: 2,
					snapshotContent: new Set(commonMap.keys()),
					children: undefined
				});
				this._statSharedSnapshots++;
			}
			checkedOptimizationEntries.add(optimizationEntry);
		}
		const unshared = capturedFiles.size;
		this._statItemsUnshared += unshared;
		this._statItemsShared += capturedFilesSize - unshared;
		return unsetOptimizationEntries;
	}
}

/* istanbul ignore next */
/**
 * @param {number} mtime mtime
 */
const applyMtime = mtime => {
	if (FS_ACCURACY > 1 && mtime % 2 !== 0) FS_ACCURACY = 1;
	else if (FS_ACCURACY > 10 && mtime % 20 !== 0) FS_ACCURACY = 10;
	else if (FS_ACCURACY > 100 && mtime % 200 !== 0) FS_ACCURACY = 100;
	else if (FS_ACCURACY > 1000 && mtime % 2000 !== 0) FS_ACCURACY = 1000;
};

/**
 * @template T
 * @template K
 * @param {Map<T, K>} a source map
 * @param {Map<T, K>} b joining map
 * @returns {Map<T, K>} joined map
 */
const mergeMaps = (a, b) => {
	if (!b || b.size === 0) return a;
	if (!a || a.size === 0) return b;
	const map = new Map(a);
	for (const [key, value] of b) {
		map.set(key, value);
	}
	return map;
};

/**
 * @template T
 * @template K
 * @param {Set<T, K>} a source map
 * @param {Set<T, K>} b joining map
 * @returns {Set<T, K>} joined map
 */
const mergeSets = (a, b) => {
	if (!b || b.size === 0) return a;
	if (!a || a.size === 0) return b;
	const map = new Set(a);
	for (const item of b) {
		map.add(item);
	}
	return map;
};

/**
 * Finding file or directory to manage
 * @param {string} managedPath path that is managing by {@link FileSystemInfo}
 * @param {string} path path to file or directory
 * @returns {string|null} managed item
 * @example
 * getManagedItem(
 *   '/Users/user/my-project/node_modules/',
 *   '/Users/user/my-project/node_modules/package/index.js'
 * ) === '/Users/user/my-project/node_modules/package'
 * getManagedItem(
 *   '/Users/user/my-project/node_modules/',
 *   '/Users/user/my-project/node_modules/package1/node_modules/package2'
 * ) === '/Users/user/my-project/node_modules/package1/node_modules/package2'
 * getManagedItem(
 *   '/Users/user/my-project/node_modules/',
 *   '/Users/user/my-project/node_modules/.bin/script.js'
 * ) === null // hidden files are disallowed as managed items
 * getManagedItem(
 *   '/Users/user/my-project/node_modules/',
 *   '/Users/user/my-project/node_modules/package'
 * ) === '/Users/user/my-project/node_modules/package'
 */
const getManagedItem = (managedPath, path) => {
	let i = managedPath.length;
	let slashes = 1;
	let startingPosition = true;
	loop: while (i < path.length) {
		switch (path.charCodeAt(i)) {
			case 47: // slash
			case 92: // backslash
				if (--slashes === 0) break loop;
				startingPosition = true;
				break;
			case 46: // .
				// hidden files are disallowed as managed items
				// it's probably .yarn-integrity or .cache
				if (startingPosition) return null;
				break;
			case 64: // @
				if (!startingPosition) return null;
				slashes++;
				break;
			default:
				startingPosition = false;
				break;
		}
		i++;
	}
	if (i === path.length) slashes--;
	// return null when path is incomplete
	if (slashes !== 0) return null;
	// if (path.slice(i + 1, i + 13) === "node_modules")
	if (
		path.length >= i + 13 &&
		path.charCodeAt(i + 1) === 110 &&
		path.charCodeAt(i + 2) === 111 &&
		path.charCodeAt(i + 3) === 100 &&
		path.charCodeAt(i + 4) === 101 &&
		path.charCodeAt(i + 5) === 95 &&
		path.charCodeAt(i + 6) === 109 &&
		path.charCodeAt(i + 7) === 111 &&
		path.charCodeAt(i + 8) === 100 &&
		path.charCodeAt(i + 9) === 117 &&
		path.charCodeAt(i + 10) === 108 &&
		path.charCodeAt(i + 11) === 101 &&
		path.charCodeAt(i + 12) === 115
	) {
		// if this is the end of the path
		if (path.length === i + 13) {
			// return the node_modules directory
			// it's special
			return path;
		}
		const c = path.charCodeAt(i + 13);
		// if next symbol is slash or backslash
		if (c === 47 || c === 92) {
			// Managed subpath
			return getManagedItem(path.slice(0, i + 14), path);
		}
	}
	return path.slice(0, i);
};

/**
 * @param {FileSystemInfoEntry} entry file system info entry
 * @returns {boolean} existence flag
 */
const toExistence = entry => {
	return Boolean(entry);
};

/**
 * Used to access information about the filesystem in a cached way
 */
class FileSystemInfo {
	/**
	 * @param {InputFileSystem} fs file system
	 * @param {Object} options options
	 * @param {Iterable<string>=} options.managedPaths paths that are only managed by a package manager
	 * @param {Iterable<string>=} options.immutablePaths paths that are immutable
	 * @param {Logger=} options.logger logger used to log invalid snapshots
	 */
	constructor(fs, { managedPaths = [], immutablePaths = [], logger } = {}) {
		this.fs = fs;
		this.logger = logger;
		this._remainingLogs = logger ? 40 : 0;
		this._loggedPaths = logger ? new Set() : undefined;
		/** @type {WeakMap<Snapshot, boolean | (function(WebpackError=, boolean=): void)[]>} */
		this._snapshotCache = new WeakMap();
		this._fileTimestampsOptimization = new SnapshotOptimization(
			s => s.hasFileTimestamps(),
			s => s.fileTimestamps,
			(s, v) => s.setFileTimestamps(v)
		);
		this._fileHashesOptimization = new SnapshotOptimization(
			s => s.hasFileHashes(),
			s => s.fileHashes,
			(s, v) => s.setFileHashes(v)
		);
		this._fileTshsOptimization = new SnapshotOptimization(
			s => s.hasFileTshs(),
			s => s.fileTshs,
			(s, v) => s.setFileTshs(v)
		);
		this._contextTimestampsOptimization = new SnapshotOptimization(
			s => s.hasContextTimestamps(),
			s => s.contextTimestamps,
			(s, v) => s.setContextTimestamps(v)
		);
		this._contextHashesOptimization = new SnapshotOptimization(
			s => s.hasContextHashes(),
			s => s.contextHashes,
			(s, v) => s.setContextHashes(v)
		);
		this._contextTshsOptimization = new SnapshotOptimization(
			s => s.hasContextTshs(),
			s => s.contextTshs,
			(s, v) => s.setContextTshs(v)
		);
		this._missingExistenceOptimization = new SnapshotOptimization(
			s => s.hasMissingExistence(),
			s => s.missingExistence,
			(s, v) => s.setMissingExistence(v)
		);
		this._managedItemInfoOptimization = new SnapshotOptimization(
			s => s.hasManagedItemInfo(),
			s => s.managedItemInfo,
			(s, v) => s.setManagedItemInfo(v)
		);
		this._managedFilesOptimization = new SnapshotOptimization(
			s => s.hasManagedFiles(),
			s => s.managedFiles,
			(s, v) => s.setManagedFiles(v),
			true
		);
		this._managedContextsOptimization = new SnapshotOptimization(
			s => s.hasManagedContexts(),
			s => s.managedContexts,
			(s, v) => s.setManagedContexts(v),
			true
		);
		this._managedMissingOptimization = new SnapshotOptimization(
			s => s.hasManagedMissing(),
			s => s.managedMissing,
			(s, v) => s.setManagedMissing(v),
			true
		);
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this._fileTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._fileHashes = new Map();
		/** @type {Map<string, TimestampAndHash | string>} */
		this._fileTshs = new Map();
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this._contextTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._contextHashes = new Map();
		/** @type {Map<string, TimestampAndHash | string>} */
		this._contextTshs = new Map();
		/** @type {Map<string, string>} */
		this._managedItems = new Map();
		/** @type {AsyncQueue<string, string, FileSystemInfoEntry | null>} */
		this.fileTimestampQueue = new AsyncQueue({
			name: "file timestamp",
			parallelism: 30,
			processor: this._readFileTimestamp.bind(this)
		});
		/** @type {AsyncQueue<string, string, string | null>} */
		this.fileHashQueue = new AsyncQueue({
			name: "file hash",
			parallelism: 10,
			processor: this._readFileHash.bind(this)
		});
		/** @type {AsyncQueue<string, string, FileSystemInfoEntry | null>} */
		this.contextTimestampQueue = new AsyncQueue({
			name: "context timestamp",
			parallelism: 2,
			processor: this._readContextTimestamp.bind(this)
		});
		/** @type {AsyncQueue<string, string, string | null>} */
		this.contextHashQueue = new AsyncQueue({
			name: "context hash",
			parallelism: 2,
			processor: this._readContextHash.bind(this)
		});
		/** @type {AsyncQueue<string, string, string | null>} */
		this.managedItemQueue = new AsyncQueue({
			name: "managed item info",
			parallelism: 10,
			processor: this._getManagedItemInfo.bind(this)
		});
		/** @type {AsyncQueue<string, string, Set<string>>} */
		this.managedItemDirectoryQueue = new AsyncQueue({
			name: "managed item directory info",
			parallelism: 10,
			processor: this._getManagedItemDirectoryInfo.bind(this)
		});
		this.managedPaths = Array.from(managedPaths);
		this.managedPathsWithSlash = this.managedPaths.map(p =>
			join(fs, p, "_").slice(0, -1)
		);
		this.immutablePaths = Array.from(immutablePaths);
		this.immutablePathsWithSlash = this.immutablePaths.map(p =>
			join(fs, p, "_").slice(0, -1)
		);

		this._cachedDeprecatedFileTimestamps = undefined;
		this._cachedDeprecatedContextTimestamps = undefined;

		this._warnAboutExperimentalEsmTracking = false;

		this._statCreatedSnapshots = 0;
		this._statTestedSnapshotsCached = 0;
		this._statTestedSnapshotsNotCached = 0;
		this._statTestedChildrenCached = 0;
		this._statTestedChildrenNotCached = 0;
		this._statTestedEntries = 0;
	}

	logStatistics() {
		const logWhenMessage = (header, message) => {
			if (message) {
				this.logger.log(`${header}: ${message}`);
			}
		};
		this.logger.log(`${this._statCreatedSnapshots} new snapshots created`);
		this.logger.log(
			`${
				this._statTestedSnapshotsNotCached &&
				Math.round(
					(this._statTestedSnapshotsNotCached * 100) /
						(this._statTestedSnapshotsCached +
							this._statTestedSnapshotsNotCached)
				)
			}% root snapshot uncached (${this._statTestedSnapshotsNotCached} / ${
				this._statTestedSnapshotsCached + this._statTestedSnapshotsNotCached
			})`
		);
		this.logger.log(
			`${
				this._statTestedChildrenNotCached &&
				Math.round(
					(this._statTestedChildrenNotCached * 100) /
						(this._statTestedChildrenCached + this._statTestedChildrenNotCached)
				)
			}% children snapshot uncached (${this._statTestedChildrenNotCached} / ${
				this._statTestedChildrenCached + this._statTestedChildrenNotCached
			})`
		);
		this.logger.log(`${this._statTestedEntries} entries tested`);
		this.logger.log(
			`File info in cache: ${this._fileTimestamps.size} timestamps ${this._fileHashes.size} hashes ${this._fileTshs.size} timestamp hash combinations`
		);
		logWhenMessage(
			`File timestamp snapshot optimization`,
			this._fileTimestampsOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`File hash snapshot optimization`,
			this._fileHashesOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`File timestamp hash combination snapshot optimization`,
			this._fileTshsOptimization.getStatisticMessage()
		);
		this.logger.log(
			`Directory info in cache: ${this._contextTimestamps.size} timestamps ${this._contextHashes.size} hashes ${this._contextTshs.size} timestamp hash combinations`
		);
		logWhenMessage(
			`Directory timestamp snapshot optimization`,
			this._contextTimestampsOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Directory hash snapshot optimization`,
			this._contextHashesOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Directory timestamp hash combination snapshot optimization`,
			this._contextTshsOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Missing items snapshot optimization`,
			this._missingExistenceOptimization.getStatisticMessage()
		);
		this.logger.log(
			`Managed items info in cache: ${this._managedItems.size} items`
		);
		logWhenMessage(
			`Managed items snapshot optimization`,
			this._managedItemInfoOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Managed files snapshot optimization`,
			this._managedFilesOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Managed contexts snapshot optimization`,
			this._managedContextsOptimization.getStatisticMessage()
		);
		logWhenMessage(
			`Managed missing snapshot optimization`,
			this._managedMissingOptimization.getStatisticMessage()
		);
	}

	_log(path, reason, ...args) {
		const key = path + reason;
		if (this._loggedPaths.has(key)) return;
		this._loggedPaths.add(key);
		this.logger.debug(`${path} invalidated because ${reason}`, ...args);
		if (--this._remainingLogs === 0) {
			this.logger.debug(
				"Logging limit has been reached and no further logging will be emitted by FileSystemInfo"
			);
		}
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry | "ignore" | null>} map timestamps
	 * @returns {void}
	 */
	addFileTimestamps(map) {
		for (const [path, ts] of map) {
			this._fileTimestamps.set(path, ts);
		}
		this._cachedDeprecatedFileTimestamps = undefined;
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry | "ignore" | null>} map timestamps
	 * @returns {void}
	 */
	addContextTimestamps(map) {
		for (const [path, ts] of map) {
			this._contextTimestamps.set(path, ts);
		}
		this._cachedDeprecatedContextTimestamps = undefined;
	}

	/**
	 * @param {string} path file path
	 * @param {function(WebpackError=, (FileSystemInfoEntry | "ignore" | null)=): void} callback callback function
	 * @returns {void}
	 */
	getFileTimestamp(path, callback) {
		const cache = this._fileTimestamps.get(path);
		if (cache !== undefined) return callback(null, cache);
		this.fileTimestampQueue.add(path, callback);
	}

	/**
	 * @param {string} path context path
	 * @param {function(WebpackError=, (FileSystemInfoEntry | "ignore" | null)=): void} callback callback function
	 * @returns {void}
	 */
	getContextTimestamp(path, callback) {
		const cache = this._contextTimestamps.get(path);
		if (cache !== undefined) return callback(null, cache);
		this.contextTimestampQueue.add(path, callback);
	}

	/**
	 * @param {string} path file path
	 * @param {function(WebpackError=, string=): void} callback callback function
	 * @returns {void}
	 */
	getFileHash(path, callback) {
		const cache = this._fileHashes.get(path);
		if (cache !== undefined) return callback(null, cache);
		this.fileHashQueue.add(path, callback);
	}

	/**
	 * @param {string} path context path
	 * @param {function(WebpackError=, string=): void} callback callback function
	 * @returns {void}
	 */
	getContextHash(path, callback) {
		const cache = this._contextHashes.get(path);
		if (cache !== undefined) return callback(null, cache);
		this.contextHashQueue.add(path, callback);
	}

	/**
	 * @param {string} context context directory
	 * @param {Iterable<string>} deps dependencies
	 * @param {function(Error=, ResolveBuildDependenciesResult=): void} callback callback function
	 * @returns {void}
	 */
	resolveBuildDependencies(context, deps, callback) {
		/** @type {Set<string>} */
		const files = new Set();
		/** @type {Set<string>} */
		const directories = new Set();
		/** @type {Set<string>} */
		const missing = new Set();
		/** @type {Set<string>} */
		const resolveFiles = new Set();
		/** @type {Set<string>} */
		const resolveDirectories = new Set();
		/** @type {Set<string>} */
		const resolveMissing = new Set();
		/** @type {Map<string, string>} */
		const resolveResults = new Map();
		/** @type {asyncLib.QueueObject<{type: number, path: string, context?: string, expected?: string }, Error>} */
		const queue = asyncLib.queue(
			({ type, context, path, expected }, callback) => {
				const resolveDirectory = path => {
					const key = `d\n${context}\n${path}`;
					if (resolveResults.has(key)) {
						return callback();
					}
					resolveContext(
						context,
						path,
						{
							fileDependencies: resolveFiles,
							contextDependencies: resolveDirectories,
							missingDependencies: resolveMissing
						},
						(err, result) => {
							if (err) {
								if (
									err.code === "ENOENT" ||
									err.code === "UNDECLARED_DEPENDENCY"
								) {
									return callback();
								}
								err.message += `\nwhile resolving '${path}' in ${context} to a directory`;
								return callback(err);
							}
							resolveResults.set(key, result);
							queue.push({
								type: RBDT_DIRECTORY,
								path: result
							});
							callback();
						}
					);
				};
				const resolveFile = path => {
					const key = `f\n${context}\n${path}`;
					if (resolveResults.has(key)) {
						return callback();
					}
					resolve(
						context,
						path,
						{
							fileDependencies: resolveFiles,
							contextDependencies: resolveDirectories,
							missingDependencies: resolveMissing
						},
						(err, result) => {
							if (expected) {
								if (result === expected) {
									resolveResults.set(key, result);
								}
							} else {
								if (err) {
									if (
										err.code === "ENOENT" ||
										err.code === "UNDECLARED_DEPENDENCY"
									) {
										return callback();
									}
									err.message += `\nwhile resolving '${path}' in ${context} as file`;
									return callback(err);
								}
								resolveResults.set(key, result);
								queue.push({
									type: RBDT_FILE,
									path: result
								});
							}
							callback();
						}
					);
				};
				switch (type) {
					case RBDT_RESOLVE: {
						const isDirectory = /[\\/]$/.test(path);
						if (isDirectory) {
							resolveDirectory(path.slice(0, path.length - 1));
						} else {
							resolveFile(path);
						}
						break;
					}
					case RBDT_RESOLVE_DIRECTORY: {
						resolveDirectory(path);
						break;
					}
					case RBDT_RESOLVE_FILE: {
						resolveFile(path);
						break;
					}
					case RBDT_FILE: {
						if (files.has(path)) {
							callback();
							break;
						}
						this.fs.realpath(path, (err, _realPath) => {
							if (err) return callback(err);
							const realPath = /** @type {string} */ (_realPath);
							if (realPath !== path) {
								resolveFiles.add(path);
							}
							if (!files.has(realPath)) {
								files.add(realPath);
								queue.push({
									type: RBDT_FILE_DEPENDENCIES,
									path: realPath
								});
							}
							callback();
						});
						break;
					}
					case RBDT_DIRECTORY: {
						if (directories.has(path)) {
							callback();
							break;
						}
						this.fs.realpath(path, (err, _realPath) => {
							if (err) return callback(err);
							const realPath = /** @type {string} */ (_realPath);
							if (realPath !== path) {
								resolveFiles.add(path);
							}
							if (!directories.has(realPath)) {
								directories.add(realPath);
								queue.push({
									type: RBDT_DIRECTORY_DEPENDENCIES,
									path: realPath
								});
							}
							callback();
						});
						break;
					}
					case RBDT_FILE_DEPENDENCIES: {
						// Check for known files without dependencies
						if (/\.json5?$|\.yarn-integrity$|yarn\.lock$|\.ya?ml/.test(path)) {
							process.nextTick(callback);
							break;
						}
						// Check commonjs cache for the module
						/** @type {NodeModule} */
						const module = require.cache[path];
						if (module && Array.isArray(module.children)) {
							children: for (const child of module.children) {
								let childPath = child.filename;
								if (childPath) {
									queue.push({
										type: RBDT_FILE,
										path: childPath
									});
									if (childPath.endsWith(".js"))
										childPath = childPath.slice(0, -3);
									const context = dirname(this.fs, path);
									for (const modulePath of module.paths) {
										if (childPath.startsWith(modulePath)) {
											const request = childPath.slice(modulePath.length + 1);
											queue.push({
												type: RBDT_RESOLVE_FILE,
												context,
												path: request,
												expected: childPath
											});
											continue children;
										}
									}
									let request = relative(this.fs, context, childPath);
									request = request.replace(/\\/g, "/");
									if (!request.startsWith("../")) request = `./${request}`;
									queue.push({
										type: RBDT_RESOLVE_FILE,
										context,
										path: request,
										expected: child.filename
									});
								}
							}
						} else if (supportsEsm && /\.m?js$/.test(path)) {
							if (!this._warnAboutExperimentalEsmTracking) {
								this.logger.info(
									"Node.js doesn't offer a (nice) way to introspect the ESM dependency graph yet.\n" +
										"Until a full solution is available webpack uses an experimental ESM tracking based on parsing.\n" +
										"As best effort webpack parses the ESM files to guess dependencies. But this can lead to expensive and incorrect tracking."
								);
								this._warnAboutExperimentalEsmTracking = true;
							}
							const lexer = require("es-module-lexer");
							lexer.init.then(() => {
								this.fs.readFile(path, (err, content) => {
									if (err) return callback(err);
									try {
										const context = dirname(this.fs, path);
										const source = content.toString();
										const [imports] = lexer.parse(source);
										for (const imp of imports) {
											try {
												let dependency;
												if (imp.d === -1) {
													// import ... from "..."
													dependency = JSON.parse(
														source.substring(imp.s - 1, imp.e + 1)
													);
												} else if (imp.d > -1) {
													// import()
													let expr = source.substring(imp.s, imp.e).trim();
													if (expr[0] === "'")
														expr = `"${expr
															.slice(1, -1)
															.replace(/"/g, '\\"')}"`;
													dependency = JSON.parse(expr);
												} else {
													// e.g. import.meta
													continue;
												}
												queue.push({
													type: RBDT_RESOLVE_FILE,
													context,
													path: dependency
												});
											} catch (e) {
												this.logger.warn(
													`Parsing of ${path} for build dependencies failed at 'import(${source.substring(
														imp.s,
														imp.e
													)})'.\n` +
														"Build dependencies behind this expression are ignored and might cause incorrect cache invalidation."
												);
												this.logger.debug(e.stack);
											}
										}
									} catch (e) {
										this.logger.warn(
											`Parsing of ${path} for build dependencies failed and all dependencies of this file are ignored, which might cause incorrect cache invalidation..`
										);
										this.logger.debug(e.stack);
									}
									process.nextTick(callback);
								});
							}, callback);
							break;
						} else {
							this.logger.log(
								`Assuming ${path} has no dependencies as we were unable to assign it to any module system.`
							);
						}
						process.nextTick(callback);
						break;
					}
					case RBDT_DIRECTORY_DEPENDENCIES: {
						const match = /(^.+[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(
							path
						);
						const packagePath = match ? match[1] : path;
						const packageJson = join(this.fs, packagePath, "package.json");
						this.fs.readFile(packageJson, (err, content) => {
							if (err) {
								if (err.code === "ENOENT") {
									resolveMissing.add(packageJson);
									const parent = dirname(this.fs, packagePath);
									if (parent !== packagePath) {
										queue.push({
											type: RBDT_DIRECTORY_DEPENDENCIES,
											path: parent
										});
									}
									callback();
									return;
								}
								return callback(err);
							}
							resolveFiles.add(packageJson);
							let packageData;
							try {
								packageData = JSON.parse(content.toString("utf-8"));
							} catch (e) {
								return callback(e);
							}
							const depsObject = packageData.dependencies;
							if (typeof depsObject === "object" && depsObject) {
								for (const dep of Object.keys(depsObject)) {
									queue.push({
										type: RBDT_RESOLVE_DIRECTORY,
										context: packagePath,
										path: dep
									});
								}
							}
							callback();
						});
						break;
					}
				}
			},
			50
		);
		queue.drain = () => {
			callback(null, {
				files,
				directories,
				missing,
				resolveResults,
				resolveDependencies: {
					files: resolveFiles,
					directories: resolveDirectories,
					missing: resolveMissing
				}
			});
		};
		queue.error = err => {
			callback(err);
			callback = () => {};
		};
		let jobQueued = false;
		for (const dep of deps) {
			queue.push({
				type: RBDT_RESOLVE,
				context,
				path: dep
			});
			jobQueued = true;
		}
		if (!jobQueued) {
			// queue won't call drain when no jobs are queue
			queue.drain();
		}
	}

	/**
	 * @param {Map<string, string>} resolveResults results from resolving
	 * @param {function(Error=, boolean=): void} callback callback with true when resolveResults resolve the same way
	 * @returns {void}
	 */
	checkResolveResultsValid(resolveResults, callback) {
		asyncLib.eachLimit(
			resolveResults,
			20,
			([key, expectedResult], callback) => {
				const [type, context, path] = key.split("\n");
				switch (type) {
					case "d":
						resolveContext(context, path, {}, (err, result) => {
							if (err) return callback(err);
							if (result !== expectedResult) return callback(INVALID);
							callback();
						});
						break;
					case "f":
						resolve(context, path, {}, (err, result) => {
							if (err) return callback(err);
							if (result !== expectedResult) return callback(INVALID);
							callback();
						});
						break;
					default:
						callback(new Error("Unexpected type in resolve result key"));
						break;
				}
			},
			/**
			 * @param {Error | typeof INVALID=} err error or invalid flag
			 * @returns {void}
			 */
			err => {
				if (err === INVALID) {
					return callback(null, false);
				}
				if (err) {
					return callback(err);
				}
				return callback(null, true);
			}
		);
	}

	/**
	 *
	 * @param {number} startTime when processing the files has started
	 * @param {Iterable<string>} files all files
	 * @param {Iterable<string>} directories all directories
	 * @param {Iterable<string>} missing all missing files or directories
	 * @param {Object} options options object (for future extensions)
	 * @param {boolean=} options.hash should use hash to snapshot
	 * @param {boolean=} options.timestamp should use timestamp to snapshot
	 * @param {function(WebpackError=, Snapshot=): void} callback callback function
	 * @returns {void}
	 */
	createSnapshot(startTime, files, directories, missing, options, callback) {
		/** @type {Map<string, FileSystemInfoEntry>} */
		const fileTimestamps = new Map();
		/** @type {Map<string, string>} */
		const fileHashes = new Map();
		/** @type {Map<string, TimestampAndHash | string>} */
		const fileTshs = new Map();
		/** @type {Map<string, FileSystemInfoEntry>} */
		const contextTimestamps = new Map();
		/** @type {Map<string, string>} */
		const contextHashes = new Map();
		/** @type {Map<string, TimestampAndHash | string>} */
		const contextTshs = new Map();
		/** @type {Map<string, boolean>} */
		const missingExistence = new Map();
		/** @type {Map<string, string>} */
		const managedItemInfo = new Map();
		/** @type {Set<string>} */
		const managedFiles = new Set();
		/** @type {Set<string>} */
		const managedContexts = new Set();
		/** @type {Set<string>} */
		const managedMissing = new Set();
		/** @type {Set<Snapshot>} */
		const children = new Set();

		/** @type {Set<string>} */
		let unsharedFileTimestamps;
		/** @type {Set<string>} */
		let unsharedFileHashes;
		/** @type {Set<string>} */
		let unsharedFileTshs;
		/** @type {Set<string>} */
		let unsharedContextTimestamps;
		/** @type {Set<string>} */
		let unsharedContextHashes;
		/** @type {Set<string>} */
		let unsharedContextTshs;
		/** @type {Set<string>} */
		let unsharedMissingExistence;
		/** @type {Set<string>} */
		let unsharedManagedItemInfo;

		/** @type {Set<string>} */
		const managedItems = new Set();

		/** 1 = timestamp, 2 = hash, 3 = timestamp + hash */
		const mode = options && options.hash ? (options.timestamp ? 3 : 2) : 1;

		let jobs = 1;
		const jobDone = () => {
			if (--jobs === 0) {
				const snapshot = new Snapshot();
				if (startTime) snapshot.setStartTime(startTime);
				if (fileTimestamps.size !== 0) {
					snapshot.setFileTimestamps(fileTimestamps);
					this._fileTimestampsOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedFileTimestamps
					);
				}
				if (fileHashes.size !== 0) {
					snapshot.setFileHashes(fileHashes);
					this._fileHashesOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedFileHashes
					);
				}
				if (fileTshs.size !== 0) {
					snapshot.setFileTshs(fileTshs);
					this._fileTshsOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedFileTshs
					);
				}
				if (contextTimestamps.size !== 0) {
					snapshot.setContextTimestamps(contextTimestamps);
					this._contextTimestampsOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedContextTimestamps
					);
				}
				if (contextHashes.size !== 0) {
					snapshot.setContextHashes(contextHashes);
					this._contextHashesOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedContextHashes
					);
				}
				if (contextTshs.size !== 0) {
					snapshot.setContextTshs(contextTshs);
					this._contextTshsOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedContextTshs
					);
				}
				if (missingExistence.size !== 0) {
					snapshot.setMissingExistence(missingExistence);
					this._missingExistenceOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedMissingExistence
					);
				}
				if (managedItemInfo.size !== 0) {
					snapshot.setManagedItemInfo(managedItemInfo);
					this._managedItemInfoOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedManagedItemInfo
					);
				}
				const unsharedManagedFiles = this._managedFilesOptimization.optimize(
					managedFiles,
					undefined,
					children
				);
				if (managedFiles.size !== 0) {
					snapshot.setManagedFiles(managedFiles);
					this._managedFilesOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedManagedFiles
					);
				}
				const unsharedManagedContexts = this._managedContextsOptimization.optimize(
					managedContexts,
					undefined,
					children
				);
				if (managedContexts.size !== 0) {
					snapshot.setManagedContexts(managedContexts);
					this._managedContextsOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedManagedContexts
					);
				}
				const unsharedManagedMissing = this._managedMissingOptimization.optimize(
					managedMissing,
					undefined,
					children
				);
				if (managedMissing.size !== 0) {
					snapshot.setManagedMissing(managedMissing);
					this._managedMissingOptimization.storeUnsharedSnapshot(
						snapshot,
						unsharedManagedMissing
					);
				}
				if (children.size !== 0) {
					snapshot.setChildren(children);
				}
				this._snapshotCache.set(snapshot, true);
				this._statCreatedSnapshots++;

				callback(null, snapshot);
			}
		};
		const jobError = () => {
			if (jobs > 0) {
				// large negative number instead of NaN or something else to keep jobs to stay a SMI (v8)
				jobs = -100000000;
				callback(null, null);
			}
		};
		const checkManaged = (path, managedSet) => {
			for (const immutablePath of this.immutablePathsWithSlash) {
				if (path.startsWith(immutablePath)) {
					managedSet.add(path);
					return true;
				}
			}
			for (const managedPath of this.managedPathsWithSlash) {
				if (path.startsWith(managedPath)) {
					const managedItem = getManagedItem(managedPath, path);
					if (managedItem) {
						managedItems.add(managedItem);
						managedSet.add(path);
						return true;
					}
				}
			}
			return false;
		};
		const captureNonManaged = (items, managedSet) => {
			const capturedItems = new Set();
			for (const path of items) {
				if (!checkManaged(path, managedSet)) capturedItems.add(path);
			}
			return capturedItems;
		};
		if (files) {
			const capturedFiles = captureNonManaged(files, managedFiles);
			switch (mode) {
				case 3:
					unsharedFileTshs = this._fileTshsOptimization.optimize(
						capturedFiles,
						undefined,
						children
					);
					for (const path of capturedFiles) {
						const cache = this._fileTshs.get(path);
						if (cache !== undefined) {
							fileTshs.set(path, cache);
						} else {
							jobs++;
							this._getFileTimestampAndHash(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting file timestamp hash combination of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									fileTshs.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
				case 2:
					unsharedFileHashes = this._fileHashesOptimization.optimize(
						capturedFiles,
						undefined,
						children
					);
					for (const path of capturedFiles) {
						const cache = this._fileHashes.get(path);
						if (cache !== undefined) {
							fileHashes.set(path, cache);
						} else {
							jobs++;
							this.fileHashQueue.add(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting file hash of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									fileHashes.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
				case 1:
					unsharedFileTimestamps = this._fileTimestampsOptimization.optimize(
						capturedFiles,
						startTime,
						children
					);
					for (const path of capturedFiles) {
						const cache = this._fileTimestamps.get(path);
						if (cache !== undefined) {
							if (cache !== "ignore") {
								fileTimestamps.set(path, cache);
							}
						} else {
							jobs++;
							this.fileTimestampQueue.add(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting file timestamp of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									fileTimestamps.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
			}
		}
		if (directories) {
			const capturedDirectories = captureNonManaged(
				directories,
				managedContexts
			);
			switch (mode) {
				case 3:
					unsharedContextTshs = this._contextTshsOptimization.optimize(
						capturedDirectories,
						undefined,
						children
					);
					for (const path of capturedDirectories) {
						const cache = this._contextTshs.get(path);
						if (cache !== undefined) {
							contextTshs.set(path, cache);
						} else {
							jobs++;
							this._getContextTimestampAndHash(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting context timestamp hash combination of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									contextTshs.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
				case 2:
					unsharedContextHashes = this._contextHashesOptimization.optimize(
						capturedDirectories,
						undefined,
						children
					);
					for (const path of capturedDirectories) {
						const cache = this._contextHashes.get(path);
						if (cache !== undefined) {
							contextHashes.set(path, cache);
						} else {
							jobs++;
							this.contextHashQueue.add(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting context hash of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									contextHashes.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
				case 1:
					unsharedContextTimestamps = this._contextTimestampsOptimization.optimize(
						capturedDirectories,
						startTime,
						children
					);
					for (const path of capturedDirectories) {
						const cache = this._contextTimestamps.get(path);
						if (cache !== undefined) {
							if (cache !== "ignore") {
								contextTimestamps.set(path, cache);
							}
						} else {
							jobs++;
							this.contextTimestampQueue.add(path, (err, entry) => {
								if (err) {
									if (this.logger) {
										this.logger.debug(
											`Error snapshotting context timestamp of ${path}: ${err.stack}`
										);
									}
									jobError();
								} else {
									contextTimestamps.set(path, entry);
									jobDone();
								}
							});
						}
					}
					break;
			}
		}
		if (missing) {
			const capturedMissing = captureNonManaged(missing, managedMissing);
			unsharedMissingExistence = this._missingExistenceOptimization.optimize(
				capturedMissing,
				startTime,
				children
			);
			for (const path of capturedMissing) {
				const cache = this._fileTimestamps.get(path);
				if (cache !== undefined) {
					if (cache !== "ignore") {
						missingExistence.set(path, toExistence(cache));
					}
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) {
							if (this.logger) {
								this.logger.debug(
									`Error snapshotting missing timestamp of ${path}: ${err.stack}`
								);
							}
							jobError();
						} else {
							missingExistence.set(path, toExistence(entry));
							jobDone();
						}
					});
				}
			}
		}
		unsharedManagedItemInfo = this._managedItemInfoOptimization.optimize(
			managedItems,
			undefined,
			children
		);
		for (const path of managedItems) {
			const cache = this._managedItems.get(path);
			if (cache !== undefined) {
				managedItemInfo.set(path, cache);
			} else {
				jobs++;
				this.managedItemQueue.add(path, (err, entry) => {
					if (err) {
						if (this.logger) {
							this.logger.debug(
								`Error snapshotting managed item ${path}: ${err.stack}`
							);
						}
						jobError();
					} else {
						managedItemInfo.set(path, entry);
						jobDone();
					}
				});
			}
		}
		jobDone();
	}

	/**
	 * @param {Snapshot} snapshot1 a snapshot
	 * @param {Snapshot} snapshot2 a snapshot
	 * @returns {Snapshot} merged snapshot
	 */
	mergeSnapshots(snapshot1, snapshot2) {
		const snapshot = new Snapshot();
		if (snapshot1.hasStartTime() && snapshot2.hasStartTime())
			snapshot.setStartTime(Math.min(snapshot1.startTime, snapshot2.startTime));
		else if (snapshot2.hasStartTime()) snapshot.startTime = snapshot2.startTime;
		else if (snapshot1.hasStartTime()) snapshot.startTime = snapshot1.startTime;
		if (snapshot1.hasFileTimestamps() || snapshot2.hasFileTimestamps()) {
			snapshot.setFileTimestamps(
				mergeMaps(snapshot1.fileTimestamps, snapshot2.fileTimestamps)
			);
		}
		if (snapshot1.hasFileHashes() || snapshot2.hasFileHashes()) {
			snapshot.setFileHashes(
				mergeMaps(snapshot1.fileHashes, snapshot2.fileHashes)
			);
		}
		if (snapshot1.hasFileTshs() || snapshot2.hasFileTshs()) {
			snapshot.setFileTshs(mergeMaps(snapshot1.fileTshs, snapshot2.fileTshs));
		}
		if (snapshot1.hasContextTimestamps() || snapshot2.hasContextTimestamps()) {
			snapshot.setContextTimestamps(
				mergeMaps(snapshot1.contextTimestamps, snapshot2.contextTimestamps)
			);
		}
		if (snapshot1.hasContextHashes() || snapshot2.hasContextHashes()) {
			snapshot.setContextHashes(
				mergeMaps(snapshot1.contextHashes, snapshot2.contextHashes)
			);
		}
		if (snapshot1.hasContextTshs() || snapshot2.hasContextTshs()) {
			snapshot.setContextTshs(
				mergeMaps(snapshot1.contextTshs, snapshot2.contextTshs)
			);
		}
		if (snapshot1.hasMissingExistence() || snapshot2.hasMissingExistence()) {
			snapshot.setMissingExistence(
				mergeMaps(snapshot1.missingExistence, snapshot2.missingExistence)
			);
		}
		if (snapshot1.hasManagedItemInfo() || snapshot2.hasManagedItemInfo()) {
			snapshot.setManagedItemInfo(
				mergeMaps(snapshot1.managedItemInfo, snapshot2.managedItemInfo)
			);
		}
		if (snapshot1.hasManagedFiles() || snapshot2.hasManagedFiles()) {
			snapshot.setManagedFiles(
				mergeSets(snapshot1.managedFiles, snapshot2.managedFiles)
			);
		}
		if (snapshot1.hasManagedContexts() || snapshot2.hasManagedContexts()) {
			snapshot.setManagedContexts(
				mergeSets(snapshot1.managedContexts, snapshot2.managedContexts)
			);
		}
		if (snapshot1.hasManagedMissing() || snapshot2.hasManagedMissing()) {
			snapshot.setManagedMissing(
				mergeSets(snapshot1.managedMissing, snapshot2.managedMissing)
			);
		}
		if (snapshot1.hasChildren() || snapshot2.hasChildren()) {
			snapshot.setChildren(mergeSets(snapshot1.children, snapshot2.children));
		}
		if (
			this._snapshotCache.get(snapshot1) === true &&
			this._snapshotCache.get(snapshot2) === true
		) {
			this._snapshotCache.set(snapshot, true);
		}
		return snapshot;
	}

	/**
	 * @param {Snapshot} snapshot the snapshot made
	 * @param {function(WebpackError=, boolean=): void} callback callback function
	 * @returns {void}
	 */
	checkSnapshotValid(snapshot, callback) {
		const cachedResult = this._snapshotCache.get(snapshot);
		if (cachedResult !== undefined) {
			this._statTestedSnapshotsCached++;
			if (typeof cachedResult === "boolean") {
				callback(null, cachedResult);
			} else {
				cachedResult.push(callback);
			}
			return;
		}
		this._statTestedSnapshotsNotCached++;
		this._checkSnapshotValidNoCache(snapshot, callback);
	}

	/**
	 * @param {Snapshot} snapshot the snapshot made
	 * @param {function(WebpackError=, boolean=): void} callback callback function
	 * @returns {void}
	 */
	_checkSnapshotValidNoCache(snapshot, callback) {
		/** @type {number | undefined} */
		let startTime = undefined;
		if (snapshot.hasStartTime()) {
			startTime = snapshot.startTime;
		}
		let jobs = 1;
		const jobDone = () => {
			if (--jobs === 0) {
				this._snapshotCache.set(snapshot, true);
				callback(null, true);
			}
		};
		const invalid = () => {
			if (jobs > 0) {
				// large negative number instead of NaN or something else to keep jobs to stay a SMI (v8)
				jobs = -100000000;
				this._snapshotCache.set(snapshot, false);
				callback(null, false);
			}
		};
		const invalidWithError = (path, err) => {
			if (this._remainingLogs > 0) {
				this._log(path, `error occurred: %s`, err);
			}
			invalid();
		};
		/**
		 * @param {string} path file path
		 * @param {string} current current hash
		 * @param {string} snap snapshot hash
		 * @returns {boolean} true, if ok
		 */
		const checkHash = (path, current, snap) => {
			if (current !== snap) {
				// If hash differ it's invalid
				if (this._remainingLogs > 0) {
					this._log(path, `hashes differ (%s != %s)`, current, snap);
				}
				return false;
			}
			return true;
		};
		/**
		 * @param {string} path file path
		 * @param {boolean} current current entry
		 * @param {boolean} snap entry from snapshot
		 * @returns {boolean} true, if ok
		 */
		const checkExistence = (path, current, snap) => {
			if (!current !== !snap) {
				// If existence of item differs
				// it's invalid
				if (this._remainingLogs > 0) {
					this._log(
						path,
						current ? "it didn't exist before" : "it does no longer exist"
					);
				}
				return false;
			}
			return true;
		};
		/**
		 * @param {string} path file path
		 * @param {FileSystemInfoEntry} current current entry
		 * @param {FileSystemInfoEntry} snap entry from snapshot
		 * @param {boolean} log log reason
		 * @returns {boolean} true, if ok
		 */
		const checkFile = (path, current, snap, log = true) => {
			if (current === snap) return true;
			if (!current !== !snap) {
				// If existence of item differs
				// it's invalid
				if (log && this._remainingLogs > 0) {
					this._log(
						path,
						current ? "it didn't exist before" : "it does no longer exist"
					);
				}
				return false;
			}
			if (current) {
				// For existing items only
				if (typeof startTime === "number" && current.safeTime > startTime) {
					// If a change happened after starting reading the item
					// this may no longer be valid
					if (log && this._remainingLogs > 0) {
						this._log(
							path,
							`it may have changed (%d) after the start time of the snapshot (%d)`,
							current.safeTime,
							startTime
						);
					}
					return false;
				}
				if (
					snap.timestamp !== undefined &&
					current.timestamp !== snap.timestamp
				) {
					// If we have a timestamp (it was a file or symlink) and it differs from current timestamp
					// it's invalid
					if (log && this._remainingLogs > 0) {
						this._log(
							path,
							`timestamps differ (%d != %d)`,
							current.timestamp,
							snap.timestamp
						);
					}
					return false;
				}
				if (
					snap.timestampHash !== undefined &&
					current.timestampHash !== snap.timestampHash
				) {
					// If we have a timestampHash (it was a directory) and it differs from current timestampHash
					// it's invalid
					if (log && this._remainingLogs > 0) {
						this._log(
							path,
							`timestamps hashes differ (%s != %s)`,
							current.timestampHash,
							snap.timestampHash
						);
					}
					return false;
				}
			}
			return true;
		};
		if (snapshot.hasChildren()) {
			const childCallback = (err, result) => {
				if (err || !result) return invalid();
				else jobDone();
			};
			for (const child of snapshot.children) {
				const cache = this._snapshotCache.get(child);
				if (cache !== undefined) {
					this._statTestedChildrenCached++;
					/* istanbul ignore else */
					if (typeof cache === "boolean") {
						if (cache === false) {
							invalid();
							return;
						}
					} else {
						jobs++;
						cache.push(childCallback);
					}
				} else {
					this._statTestedChildrenNotCached++;
					jobs++;
					this._checkSnapshotValidNoCache(child, childCallback);
				}
			}
		}
		if (snapshot.hasFileTimestamps()) {
			const { fileTimestamps } = snapshot;
			this._statTestedEntries += fileTimestamps.size;
			for (const [path, ts] of fileTimestamps) {
				const cache = this._fileTimestamps.get(path);
				if (cache !== undefined) {
					if (cache !== "ignore" && !checkFile(path, cache, ts)) {
						invalid();
						return;
					}
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) return invalidWithError(path, err);
						if (!checkFile(path, entry, ts)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		const processFileHashSnapshot = (path, hash) => {
			const cache = this._fileHashes.get(path);
			if (cache !== undefined) {
				if (cache !== "ignore" && !checkHash(path, cache, hash)) {
					invalid();
					return;
				}
			} else {
				jobs++;
				this.fileHashQueue.add(path, (err, entry) => {
					if (err) return invalidWithError(path, err);
					if (!checkHash(path, entry, hash)) {
						invalid();
					} else {
						jobDone();
					}
				});
			}
		};
		if (snapshot.hasFileHashes()) {
			const { fileHashes } = snapshot;
			this._statTestedEntries += fileHashes.size;
			for (const [path, hash] of fileHashes) {
				processFileHashSnapshot(path, hash);
			}
		}
		if (snapshot.hasFileTshs()) {
			const { fileTshs } = snapshot;
			this._statTestedEntries += fileTshs.size;
			for (const [path, tsh] of fileTshs) {
				if (typeof tsh === "string") {
					processFileHashSnapshot(path, tsh);
				} else {
					const cache = this._fileTimestamps.get(path);
					if (cache !== undefined) {
						if (cache === "ignore" || !checkFile(path, cache, tsh, false)) {
							processFileHashSnapshot(path, tsh.hash);
						}
					} else {
						jobs++;
						this.fileTimestampQueue.add(path, (err, entry) => {
							if (err) return invalidWithError(path, err);
							if (!checkFile(path, entry, tsh, false)) {
								processFileHashSnapshot(path, tsh.hash);
							}
							jobDone();
						});
					}
				}
			}
		}
		if (snapshot.hasContextTimestamps()) {
			const { contextTimestamps } = snapshot;
			this._statTestedEntries += contextTimestamps.size;
			for (const [path, ts] of contextTimestamps) {
				const cache = this._contextTimestamps.get(path);
				if (cache !== undefined) {
					if (cache !== "ignore" && !checkFile(path, cache, ts)) {
						invalid();
						return;
					}
				} else {
					jobs++;
					this.contextTimestampQueue.add(path, (err, entry) => {
						if (err) return invalidWithError(path, err);
						if (!checkFile(path, entry, ts)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		const processContextHashSnapshot = (path, hash) => {
			const cache = this._contextHashes.get(path);
			if (cache !== undefined) {
				if (cache !== "ignore" && !checkHash(path, cache, hash)) {
					invalid();
					return;
				}
			} else {
				jobs++;
				this.contextHashQueue.add(path, (err, entry) => {
					if (err) return invalidWithError(path, err);
					if (!checkHash(path, entry, hash)) {
						invalid();
					} else {
						jobDone();
					}
				});
			}
		};
		if (snapshot.hasContextHashes()) {
			const { contextHashes } = snapshot;
			this._statTestedEntries += contextHashes.size;
			for (const [path, hash] of contextHashes) {
				processContextHashSnapshot(path, hash);
			}
		}
		if (snapshot.hasContextTshs()) {
			const { contextTshs } = snapshot;
			this._statTestedEntries += contextTshs.size;
			for (const [path, tsh] of contextTshs) {
				if (typeof tsh === "string") {
					processContextHashSnapshot(path, tsh);
				} else {
					const cache = this._contextTimestamps.get(path);
					if (cache !== undefined) {
						if (cache === "ignore" || !checkFile(path, cache, tsh, false)) {
							processContextHashSnapshot(path, tsh.hash);
						}
					} else {
						jobs++;
						this.contextTimestampQueue.add(path, (err, entry) => {
							if (err) return invalidWithError(path, err);
							if (!checkFile(path, entry, tsh, false)) {
								processContextHashSnapshot(path, tsh.hash);
							}
							jobDone();
						});
					}
				}
			}
		}
		if (snapshot.hasMissingExistence()) {
			const { missingExistence } = snapshot;
			this._statTestedEntries += missingExistence.size;
			for (const [path, existence] of missingExistence) {
				const cache = this._fileTimestamps.get(path);
				if (cache !== undefined) {
					if (
						cache !== "ignore" &&
						!checkExistence(path, toExistence(cache), existence)
					) {
						invalid();
						return;
					}
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) return invalidWithError(path, err);
						if (!checkExistence(path, toExistence(entry), existence)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		if (snapshot.hasManagedItemInfo()) {
			const { managedItemInfo } = snapshot;
			this._statTestedEntries += managedItemInfo.size;
			for (const [path, info] of managedItemInfo) {
				const cache = this._managedItems.get(path);
				if (cache !== undefined) {
					if (!checkHash(path, cache, info)) {
						invalid();
						return;
					}
				} else {
					jobs++;
					this.managedItemQueue.add(path, (err, entry) => {
						if (err) return invalidWithError(path, err);
						if (!checkHash(path, entry, info)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		jobDone();

		// if there was an async action
		// try to join multiple concurrent request for this snapshot
		if (jobs > 0) {
			const callbacks = [callback];
			callback = (err, result) => {
				for (const callback of callbacks) callback(err, result);
			};
			this._snapshotCache.set(snapshot, callbacks);
		}
	}

	_readFileTimestamp(path, callback) {
		this.fs.stat(path, (err, stat) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._fileTimestamps.set(path, null);
					this._cachedDeprecatedFileTimestamps = undefined;
					return callback(null, null);
				}
				return callback(err);
			}

			let ts;
			if (stat.isDirectory()) {
				ts = {
					safeTime: 0,
					timestamp: undefined
				};
			} else {
				const mtime = +stat.mtime;

				if (mtime) applyMtime(mtime);

				ts = {
					safeTime: mtime ? mtime + FS_ACCURACY : Infinity,
					timestamp: mtime
				};
			}

			this._fileTimestamps.set(path, ts);
			this._cachedDeprecatedFileTimestamps = undefined;

			callback(null, ts);
		});
	}

	_readFileHash(path, callback) {
		this.fs.readFile(path, (err, content) => {
			if (err) {
				if (err.code === "EISDIR") {
					this._fileHashes.set(path, "directory");
					return callback(null, "directory");
				}
				if (err.code === "ENOENT") {
					this._fileHashes.set(path, null);
					return callback(null, null);
				}
				if (err.code === "ERR_FS_FILE_TOO_LARGE") {
					this.logger.warn(`Ignoring ${path} for hashing as it's very large`);
					this._fileHashes.set(path, "too large");
					return callback(null, "too large");
				}
				return callback(err);
			}

			const hash = createHash("md4");

			hash.update(content);

			const digest = /** @type {string} */ (hash.digest("hex"));

			this._fileHashes.set(path, digest);

			callback(null, digest);
		});
	}

	_getFileTimestampAndHash(path, callback) {
		const continueWithHash = hash => {
			const cache = this._fileTimestamps.get(path);
			if (cache !== undefined) {
				if (cache !== "ignore") {
					const result = {
						...cache,
						hash
					};
					this._fileTshs.set(path, result);
					return callback(null, result);
				} else {
					this._fileTshs.set(path, hash);
					return callback(null, hash);
				}
			} else {
				this.fileTimestampQueue.add(path, (err, entry) => {
					if (err) {
						return callback(err);
					}
					const result = {
						...entry,
						hash
					};
					this._fileTshs.set(path, result);
					return callback(null, result);
				});
			}
		};

		const cache = this._fileHashes.get(path);
		if (cache !== undefined) {
			continueWithHash(cache);
		} else {
			this.fileHashQueue.add(path, (err, entry) => {
				if (err) {
					return callback(err);
				}
				continueWithHash(entry);
			});
		}
	}

	_readContextTimestamp(path, callback) {
		this.fs.readdir(path, (err, _files) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._contextTimestamps.set(path, null);
					this._cachedDeprecatedContextTimestamps = undefined;
					return callback(null, null);
				}
				return callback(err);
			}
			const files = /** @type {string[]} */ (_files)
				.map(file => file.normalize("NFC"))
				.filter(file => !/^\./.test(file))
				.sort();
			asyncLib.map(
				files,
				(file, callback) => {
					const child = join(this.fs, path, file);
					this.fs.stat(child, (err, stat) => {
						if (err) return callback(err);

						for (const immutablePath of this.immutablePathsWithSlash) {
							if (path.startsWith(immutablePath)) {
								// ignore any immutable path for timestamping
								return callback(null, null);
							}
						}
						for (const managedPath of this.managedPathsWithSlash) {
							if (path.startsWith(managedPath)) {
								const managedItem = getManagedItem(managedPath, child);
								if (managedItem) {
									// construct timestampHash from managed info
									return this.managedItemQueue.add(managedItem, (err, info) => {
										if (err) return callback(err);
										return callback(null, {
											safeTime: 0,
											timestampHash: info
										});
									});
								}
							}
						}

						if (stat.isFile()) {
							return this.getFileTimestamp(child, callback);
						}
						if (stat.isDirectory()) {
							this.contextTimestampQueue.increaseParallelism();
							this.getContextTimestamp(child, (err, tsEntry) => {
								this.contextTimestampQueue.decreaseParallelism();
								callback(err, tsEntry);
							});
							return;
						}
						callback(null, null);
					});
				},
				(err, tsEntries) => {
					if (err) return callback(err);
					const hash = createHash("md4");

					for (const file of files) hash.update(file);
					let safeTime = 0;
					for (const entry of tsEntries) {
						if (!entry) {
							hash.update("n");
							continue;
						}
						if (entry.timestamp) {
							hash.update("f");
							hash.update(`${entry.timestamp}`);
						} else if (entry.timestampHash) {
							hash.update("d");
							hash.update(`${entry.timestampHash}`);
						}
						if (entry.safeTime) {
							safeTime = Math.max(safeTime, entry.safeTime);
						}
					}

					const digest = /** @type {string} */ (hash.digest("hex"));

					const result = {
						safeTime,
						timestampHash: digest
					};

					this._contextTimestamps.set(path, result);
					this._cachedDeprecatedContextTimestamps = undefined;

					callback(null, result);
				}
			);
		});
	}

	_readContextHash(path, callback) {
		this.fs.readdir(path, (err, _files) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._contextHashes.set(path, null);
					return callback(null, null);
				}
				return callback(err);
			}
			const files = /** @type {string[]} */ (_files)
				.map(file => file.normalize("NFC"))
				.filter(file => !/^\./.test(file))
				.sort();
			asyncLib.map(
				files,
				(file, callback) => {
					const child = join(this.fs, path, file);
					this.fs.stat(child, (err, stat) => {
						if (err) return callback(err);

						for (const immutablePath of this.immutablePathsWithSlash) {
							if (path.startsWith(immutablePath)) {
								// ignore any immutable path for hashing
								return callback(null, "");
							}
						}
						for (const managedPath of this.managedPathsWithSlash) {
							if (path.startsWith(managedPath)) {
								const managedItem = getManagedItem(managedPath, child);
								if (managedItem) {
									// construct hash from managed info
									return this.managedItemQueue.add(managedItem, (err, info) => {
										if (err) return callback(err);
										callback(null, info || "");
									});
								}
							}
						}

						if (stat.isFile()) {
							return this.getFileHash(child, (err, hash) => {
								callback(err, hash || "");
							});
						}
						if (stat.isDirectory()) {
							this.contextHashQueue.increaseParallelism();
							this.getContextHash(child, (err, hash) => {
								this.contextHashQueue.decreaseParallelism();
								callback(err, hash || "");
							});
							return;
						}
						callback(null, "");
					});
				},
				(err, fileHashes) => {
					if (err) return callback(err);
					const hash = createHash("md4");

					for (const file of files) hash.update(file);
					for (const h of fileHashes) hash.update(h);

					const digest = /** @type {string} */ (hash.digest("hex"));

					this._contextHashes.set(path, digest);

					callback(null, digest);
				}
			);
		});
	}

	_getContextTimestampAndHash(path, callback) {
		const continueWithHash = hash => {
			const cache = this._contextTimestamps.get(path);
			if (cache !== undefined) {
				if (cache !== "ignore") {
					const result = {
						...cache,
						hash
					};
					this._contextTshs.set(path, result);
					return callback(null, result);
				} else {
					this._contextTshs.set(path, hash);
					return callback(null, hash);
				}
			} else {
				this.contextTimestampQueue.add(path, (err, entry) => {
					if (err) {
						return callback(err);
					}
					const result = {
						...entry,
						hash
					};
					this._contextTshs.set(path, result);
					return callback(null, result);
				});
			}
		};

		const cache = this._contextHashes.get(path);
		if (cache !== undefined) {
			continueWithHash(cache);
		} else {
			this.contextHashQueue.add(path, (err, entry) => {
				if (err) {
					return callback(err);
				}
				continueWithHash(entry);
			});
		}
	}

	_getManagedItemDirectoryInfo(path, callback) {
		this.fs.readdir(path, (err, elements) => {
			if (err) {
				if (err.code === "ENOENT" || err.code === "ENOTDIR") {
					return callback(null, EMPTY_SET);
				}
				return callback(err);
			}
			const set = new Set(
				/** @type {string[]} */ (elements).map(element =>
					join(this.fs, path, element)
				)
			);
			callback(null, set);
		});
	}

	_getManagedItemInfo(path, callback) {
		const dir = dirname(this.fs, path);
		this.managedItemDirectoryQueue.add(dir, (err, elements) => {
			if (err) {
				return callback(err);
			}
			if (!elements.has(path)) {
				// file or directory doesn't exist
				this._managedItems.set(path, "missing");
				return callback(null, "missing");
			}
			// something exists
			// it may be a file or directory
			if (
				path.endsWith("node_modules") &&
				(path.endsWith("/node_modules") || path.endsWith("\\node_modules"))
			) {
				// we are only interested in existence of this special directory
				this._managedItems.set(path, "exists");
				return callback(null, "exists");
			}

			// we assume it's a directory, as files shouldn't occur in managed paths
			const packageJsonPath = join(this.fs, path, "package.json");
			this.fs.readFile(packageJsonPath, (err, content) => {
				if (err) {
					if (err.code === "ENOENT" || err.code === "ENOTDIR") {
						// no package.json or path is not a directory
						this.fs.readdir(path, (err, elements) => {
							if (
								!err &&
								elements.length === 1 &&
								elements[0] === "node_modules"
							) {
								// This is only a grouping folder e. g. used by yarn
								// we are only interested in existence of this special directory
								this._managedItems.set(path, "nested");
								return callback(null, "nested");
							}
							const problem = `Managed item ${path} isn't a directory or doesn't contain a package.json`;
							this.logger.warn(problem);
							return callback(new Error(problem));
						});
						return;
					}
					return callback(err);
				}
				let data;
				try {
					data = JSON.parse(content.toString("utf-8"));
				} catch (e) {
					return callback(e);
				}
				const info = `${data.name || ""}@${data.version || ""}`;
				this._managedItems.set(path, info);
				callback(null, info);
			});
		});
	}

	getDeprecatedFileTimestamps() {
		if (this._cachedDeprecatedFileTimestamps !== undefined)
			return this._cachedDeprecatedFileTimestamps;
		const map = new Map();
		for (const [path, info] of this._fileTimestamps) {
			if (info) map.set(path, typeof info === "object" ? info.safeTime : null);
		}
		return (this._cachedDeprecatedFileTimestamps = map);
	}

	getDeprecatedContextTimestamps() {
		if (this._cachedDeprecatedContextTimestamps !== undefined)
			return this._cachedDeprecatedContextTimestamps;
		const map = new Map();
		for (const [path, info] of this._contextTimestamps) {
			if (info) map.set(path, typeof info === "object" ? info.safeTime : null);
		}
		return (this._cachedDeprecatedContextTimestamps = map);
	}
}

module.exports = FileSystemInfo;
module.exports.Snapshot = Snapshot;
