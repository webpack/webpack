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

/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const resolveContext = createResolver({
	resolveToContext: true
});
const resolve = createResolver({
	extensions: [".js", ".json", ".node"]
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
 * @typedef {Object} Snapshot
 * @property {number=} startTime
 * @property {Map<string, FileSystemInfoEntry>=} fileTimestamps
 * @property {Map<string, string>=} fileHashes
 * @property {Map<string, FileSystemInfoEntry>=} contextTimestamps
 * @property {Map<string, string>=} contextHashes
 * @property {Map<string, boolean>=} missingExistence
 * @property {Map<string, string>=} managedItemInfo
 * @property {Set<Snapshot>=} children
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
		/** @type {Map<string, SnapshotOptimizationEntry>} */
		this._snapshotOptimization = new Map();
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this._fileTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._fileHashes = new Map();
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this._contextTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._contextHashes = new Map();
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
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry | "ignore" | null>} map timestamps
	 * @returns {void}
	 */
	addContextTimestamps(map) {
		for (const [path, ts] of map) {
			this._contextTimestamps.set(path, ts);
		}
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
								)
									return callback();
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
									)
										return callback();
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
						this.fs.realpath(path, (err, realPath) => {
							if (err) return callback(err);
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
						this.fs.realpath(path, (err, realPath) => {
							if (err) return callback(err);
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
						} else {
							// Unable to get dependencies from module system
							// This may be because of an incomplete require.cache implementation like in jest
							// Assume requires stay in directory and add the whole directory
							const directory = dirname(this.fs, path);
							queue.push({
								type: RBDT_DIRECTORY,
								path: directory
							});
						}
						callback();
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
	 * @param {function(WebpackError=, Snapshot=): void} callback callback function
	 * @returns {void}
	 */
	createSnapshot(startTime, files, directories, missing, options, callback) {
		/** @type {Map<string, FileSystemInfoEntry>} */
		const fileTimestamps = new Map();
		/** @type {Map<string, string>} */
		const fileHashes = new Map();
		/** @type {Map<string, FileSystemInfoEntry>} */
		const contextTimestamps = new Map();
		/** @type {Map<string, string>} */
		const contextHashes = new Map();
		/** @type {Map<string, boolean>} */
		const missingExistence = new Map();
		/** @type {Map<string, string>} */
		const managedItemInfo = new Map();
		/** @type {Set<Snapshot>} */
		const children = new Set();

		/** @type {Set<string>} */
		const unsetOptimizationEntries = new Set();

		/** @type {Set<string>} */
		const managedItems = new Set();

		let jobs = 1;
		const jobDone = () => {
			if (--jobs === 0) {
				const snapshot = {};
				if (startTime) snapshot.startTime = startTime;
				if (fileTimestamps.size !== 0) snapshot.fileTimestamps = fileTimestamps;
				if (fileHashes.size !== 0) snapshot.fileHashes = fileHashes;
				if (contextTimestamps.size !== 0)
					snapshot.contextTimestamps = contextTimestamps;
				if (contextHashes.size !== 0) snapshot.contextHashes = contextHashes;
				if (missingExistence.size !== 0)
					snapshot.missingExistence = missingExistence;
				if (managedItemInfo.size !== 0)
					snapshot.managedItemInfo = managedItemInfo;
				if (children.size !== 0) snapshot.children = children;
				this._snapshotCache.set(snapshot, true);
				const optimizationEntry = {
					snapshot,
					shared: 0,
					snapshotContent: undefined,
					children: undefined
				};
				for (const path of unsetOptimizationEntries) {
					this._snapshotOptimization.set(path, optimizationEntry);
				}
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
		if (files) {
			if (options && options.hash) {
				files: for (const path of files) {
					for (const immutablePath of this.immutablePathsWithSlash) {
						if (path.startsWith(immutablePath)) {
							continue files;
						}
					}
					for (const managedPath of this.managedPathsWithSlash) {
						if (path.startsWith(managedPath)) {
							const managedItem = getManagedItem(managedPath, path);
							if (managedItem) {
								managedItems.add(managedItem);
								continue files;
							}
						}
					}
					const cache = this._fileHashes.get(path);
					if (cache !== undefined) {
						fileHashes.set(path, cache);
					} else {
						jobs++;
						this.fileHashQueue.add(path, (err, entry) => {
							if (err) {
								if (this.logger) {
									this.logger.debug(
										`Error snapshotting file hash of ${path}: ${err}`
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
			} else {
				const capturedFiles = new Set();
				files: for (const path of files) {
					for (const immutablePath of this.immutablePathsWithSlash) {
						if (path.startsWith(immutablePath)) {
							continue files;
						}
					}
					for (const managedPath of this.managedPathsWithSlash) {
						if (path.startsWith(managedPath)) {
							const managedItem = getManagedItem(managedPath, path);
							if (managedItem) {
								managedItems.add(managedItem);
								continue files;
							}
						}
					}
					capturedFiles.add(path);
				}
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
						const old = this._snapshotOptimization.get(path);
						if (old.shared < entry.shared) {
							this._snapshotOptimization.set(path, entry);
						}
						capturedFiles.delete(path);
					}
				};
				capturedFiles: for (const path of capturedFiles) {
					const optimizationEntry = this._snapshotOptimization.get(path);
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
						for (const path of optimizationEntry.snapshotContent) {
							if (!capturedFiles.has(path)) {
								if (!snapshot.fileTimestamps.has(path)) {
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
						} else {
							// Only a part of the snapshot is shared
							// Extract common timestamps from both snapshots
							const commonMap = new Map();
							for (const [path, ts] of snapshot.fileTimestamps) {
								if (nonSharedFiles.has(path)) continue;
								commonMap.set(path, ts);
								snapshot.fileTimestamps.delete(path);
							}
							// Create and attach snapshot
							/** @type {Snapshot} */
							const commonSnapshot = {
								startTime:
									startTime && snapshot.startTime
										? Math.min(startTime, snapshot.startTime)
										: startTime || snapshot.startTime,
								fileTimestamps: commonMap
							};
							children.add(commonSnapshot);
							if (!snapshot.children) snapshot.children = new Set();
							snapshot.children.add(commonSnapshot);
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
						}
					} else {
						// It's a unshared snapshot
						// We can extract a common shared snapshot
						// with all common files
						const commonMap = new Map();
						for (const path of capturedFiles) {
							const ts = snapshot.fileTimestamps.get(path);
							if (ts === undefined) continue;
							commonMap.set(path, ts);
						}
						if (commonMap.size < 2) {
							// Common part it too small
							continue capturedFiles;
						}
						// Create and attach snapshot
						/** @type {Snapshot} */
						const commonSnapshot = {
							startTime:
								startTime && snapshot.startTime
									? Math.min(startTime, snapshot.startTime)
									: startTime || snapshot.startTime,
							fileTimestamps: commonMap
						};
						children.add(commonSnapshot);
						if (!snapshot.children) snapshot.children = new Set();
						snapshot.children.add(commonSnapshot);
						// Remove files from snapshot
						for (const path of commonMap.keys())
							snapshot.fileTimestamps.delete(path);
						// Create optimization entry
						storeOptimizationEntry({
							snapshot: commonSnapshot,
							shared: 2,
							snapshotContent: new Set(commonMap.keys()),
							children: undefined
						});
					}
				}
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
										`Error snapshotting file timestamp of ${path}: ${err}`
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
			}
		}
		if (directories) {
			if (options && options.hash) {
				directories: for (const path of directories) {
					for (const immutablePath of this.immutablePathsWithSlash) {
						if (path.startsWith(immutablePath)) {
							continue directories;
						}
					}
					for (const managedPath of this.managedPathsWithSlash) {
						if (path.startsWith(managedPath)) {
							const managedItem = getManagedItem(managedPath, path);
							if (managedItem) {
								managedItems.add(managedItem);
								continue directories;
							}
						}
					}
					const cache = this._contextHashes.get(path);
					if (cache !== undefined) {
						contextHashes.set(path, cache);
					} else {
						jobs++;
						this.contextHashQueue.add(path, (err, entry) => {
							if (err) {
								if (this.logger) {
									this.logger.debug(
										`Error snapshotting context hash of ${path}: ${err}`
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
			} else {
				directories: for (const path of directories) {
					for (const immutablePath of this.immutablePathsWithSlash) {
						if (path.startsWith(immutablePath)) {
							continue directories;
						}
					}
					for (const managedPath of this.managedPathsWithSlash) {
						if (path.startsWith(managedPath)) {
							const managedItem = getManagedItem(managedPath, path);
							if (managedItem) {
								managedItems.add(managedItem);
								continue directories;
							}
						}
					}
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
										`Error snapshotting context timestamp of ${path}: ${err}`
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
			}
		}
		if (missing) {
			missing: for (const path of missing) {
				for (const immutablePath of this.immutablePathsWithSlash) {
					if (path.startsWith(immutablePath)) {
						continue missing;
					}
				}
				for (const managedPath of this.managedPathsWithSlash) {
					if (path.startsWith(managedPath)) {
						const managedItem = getManagedItem(managedPath, path);
						if (managedItem) {
							managedItems.add(managedItem);
							continue missing;
						}
					}
				}
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
									`Error snapshotting missing timestamp of ${path}: ${err}`
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
								`Error snapshotting managed item ${path}: ${err}`
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
		/** @type {Snapshot} */
		const snapshot = {};
		if (snapshot1.startTime && snapshot2.startTime)
			snapshot.startTime = Math.min(snapshot1.startTime, snapshot2.startTime);
		else if (snapshot2.startTime) snapshot.startTime = snapshot2.startTime;
		else if (snapshot1.startTime) snapshot.startTime = snapshot1.startTime;
		if (snapshot1.fileTimestamps || snapshot2.fileTimestamps) {
			snapshot.fileTimestamps = mergeMaps(
				snapshot1.fileTimestamps,
				snapshot2.fileTimestamps
			);
		}
		if (snapshot1.fileHashes || snapshot2.fileHashes) {
			snapshot.fileHashes = mergeMaps(
				snapshot1.fileHashes,
				snapshot2.fileHashes
			);
		}
		if (snapshot1.contextTimestamps || snapshot2.contextTimestamps) {
			snapshot.contextTimestamps = mergeMaps(
				snapshot1.contextTimestamps,
				snapshot2.contextTimestamps
			);
		}
		if (snapshot1.contextHashes || snapshot2.contextHashes) {
			snapshot.contextHashes = mergeMaps(
				snapshot1.contextHashes,
				snapshot2.contextHashes
			);
		}
		if (snapshot1.missingExistence || snapshot2.missingExistence) {
			snapshot.missingExistence = mergeMaps(
				snapshot1.missingExistence,
				snapshot2.missingExistence
			);
		}
		if (snapshot1.managedItemInfo || snapshot2.managedItemInfo) {
			snapshot.managedItemInfo = mergeMaps(
				snapshot1.managedItemInfo,
				snapshot2.managedItemInfo
			);
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
			if (typeof cachedResult === "boolean") {
				callback(null, cachedResult);
			} else {
				cachedResult.push(callback);
			}
			return;
		}
		this._checkSnapshotValidNoCache(snapshot, callback);
	}

	_checkSnapshotValidNoCache(snapshot, callback) {
		let callbacks;
		const {
			startTime,
			fileTimestamps,
			fileHashes,
			contextTimestamps,
			contextHashes,
			missingExistence,
			managedItemInfo,
			children
		} = snapshot;
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
		 * @returns {boolean} true, if ok
		 */
		const checkFile = (path, current, snap) => {
			if (current === snap) return true;
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
			if (current) {
				// For existing items only
				if (typeof startTime === "number" && current.safeTime > startTime) {
					// If a change happened after starting reading the item
					// this may no longer be valid
					if (this._remainingLogs > 0) {
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
					if (this._remainingLogs > 0) {
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
					if (this._remainingLogs > 0) {
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
		if (children) {
			const childCallback = (err, result) => {
				if (err || !result) return invalid();
				else jobDone();
			};
			for (const child of children) {
				const cache = this._snapshotCache.get(child);
				if (cache !== undefined) {
					if (cache !== undefined) {
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
					}
				} else {
					jobs++;
					this._checkSnapshotValidNoCache(child, childCallback);
				}
			}
		}
		if (fileTimestamps) {
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
		if (fileHashes) {
			for (const [path, hash] of fileHashes) {
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
			}
		}
		if (contextTimestamps && contextTimestamps.size > 0) {
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
		if (contextHashes) {
			for (const [path, hash] of contextHashes) {
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
			}
		}
		if (missingExistence) {
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
		if (managedItemInfo) {
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
			callbacks = [callback];
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

			callback(null, ts);
		});
	}

	_readFileHash(path, callback) {
		this.fs.readFile(path, (err, content) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._fileHashes.set(path, null);
					return callback(null, null);
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

	_readContextTimestamp(path, callback) {
		this.fs.readdir(path, (err, files) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._contextTimestamps.set(path, null);
					return callback(null, null);
				}
				return callback(err);
			}
			files = files
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

					callback(null, result);
				}
			);
		});
	}

	_readContextHash(path, callback) {
		this.fs.readdir(path, (err, files) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._contextHashes.set(path, null);
					return callback(null, null);
				}
				return callback(err);
			}
			files = files
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

	_getManagedItemDirectoryInfo(path, callback) {
		this.fs.readdir(path, (err, elements) => {
			if (err) {
				if (err.code === "ENOENT" || err.code === "ENOTDIR") {
					return callback(null, EMPTY_SET);
				}
				return callback(err);
			}
			const set = new Set(
				elements.map(element => join(this.fs, path, element))
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
						const problem = `Managed item ${path} isn't a directory or doesn't contain a package.json`;
						this.logger.warn(problem);
						return callback(new Error(problem));
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
		const map = new Map();
		for (const [path, info] of this._fileTimestamps) {
			if (info) map.set(path, typeof info === "object" ? info.safeTime : null);
		}
		return map;
	}

	getDeprecatedContextTimestamps() {
		const map = new Map();
		for (const [path, info] of this._contextTimestamps) {
			if (info) map.set(path, typeof info === "object" ? info.safeTime : null);
		}
		return map;
	}
}

module.exports = FileSystemInfo;
