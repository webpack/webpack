/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const resolve = require("enhanced-resolve");
const asyncLib = require("neo-async");
const AsyncQueue = require("./util/AsyncQueue");
const createHash = require("./util/createHash");
const { join, dirname, relative } = require("./util/fs");

/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const resolveContext = resolve.create({
	resolveToContext: true
});

let FS_ACCURACY = 2000;

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
 * @property {Map<string, FileSystemInfoEntry | "error">=} fileTimestamps
 * @property {Map<string, string | "error">=} fileHashes
 * @property {Map<string, FileSystemInfoEntry | "error">=} contextTimestamps
 * @property {Map<string, string | "error">=} contextHashes
 * @property {Map<string, FileSystemInfoEntry | "error">=} missingTimestamps
 * @property {Map<string, string | "error">=} managedItemInfo
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

/**
 * istanbul ignore next
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
 * Used to access information about the filesystem in a cached way
 */
class FileSystemInfo {
	/**
	 * @param {InputFileSystem} fs file system
	 * @param {Object} options options
	 * @param {Iterable<string>=} options.managedPaths paths that are only managed by a package manager
	 * @param {Iterable<string>=} options.immutablePaths paths that are immutable
	 */
	constructor(fs, { managedPaths = [], immutablePaths = [] } = {}) {
		this.fs = fs;
		/** @type {WeakMap<Snapshot, boolean | (function(WebpackError=, boolean=): void)[]>} */
		this._snapshotCache = new WeakMap();
		/** @type {Map<string, FileSystemInfoEntry | null>} */
		this._fileTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._fileHashes = new Map();
		/** @type {Map<string, FileSystemInfoEntry | null>} */
		this._contextTimestamps = new Map();
		/** @type {Map<string, string>} */
		this._contextHashes = new Map();
		/** @type {Map<string, string>} */
		this._managedItems = new Map();
		this.fileTimestampQueue = new AsyncQueue({
			name: "file timestamp",
			parallelism: 30,
			processor: this._readFileTimestamp.bind(this)
		});
		this.fileHashQueue = new AsyncQueue({
			name: "file hash",
			parallelism: 10,
			processor: this._readFileHash.bind(this)
		});
		this.contextTimestampQueue = new AsyncQueue({
			name: "context timestamp",
			parallelism: 2,
			processor: this._readContextTimestamp.bind(this)
		});
		this.contextHashQueue = new AsyncQueue({
			name: "context hash",
			parallelism: 2,
			processor: this._readContextHash.bind(this)
		});
		this.managedItemQueue = new AsyncQueue({
			name: "managed item info",
			parallelism: 10,
			processor: this._getManagedItemInfo.bind(this)
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

	/**
	 * @param {Map<string, FileSystemInfoEntry | null>} map timestamps
	 * @returns {void}
	 */
	addFileTimestamps(map) {
		for (const [path, ts] of map) {
			this._fileTimestamps.set(path, ts);
		}
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry | null>} map timestamps
	 * @returns {void}
	 */
	addContextTimestamps(map) {
		for (const [path, ts] of map) {
			this._contextTimestamps.set(path, ts);
		}
	}

	/**
	 * @param {string} path file path
	 * @param {function(WebpackError=, FileSystemInfoEntry=): void} callback callback function
	 * @returns {void}
	 */
	getFileTimestamp(path, callback) {
		const cache = this._fileTimestamps.get(path);
		if (cache !== undefined) return callback(null, cache);
		this.fileTimestampQueue.add(path, callback);
	}

	/**
	 * @param {string} path context path
	 * @param {function(WebpackError=, FileSystemInfoEntry=): void} callback callback function
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
						resolveContext(context, path, (err, result) => {
							if (err) return callback(err);
							if (result !== expectedResult) return callback(INVALID);
							callback();
						});
						break;
					case "f":
						resolve(context, path, (err, result) => {
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
	 * @param {function(WebpackError=, Snapshot=): void} callback callback function
	 * @returns {void}
	 */
	createSnapshot(startTime, files, directories, missing, options, callback) {
		/** @type {Map<string, FileSystemInfoEntry | "error">} */
		const fileTimestamps = new Map();
		/** @type {Map<string, string | "error">} */
		const fileHashes = new Map();
		/** @type {Map<string, FileSystemInfoEntry | "error">} */
		const contextTimestamps = new Map();
		/** @type {Map<string, string | "error">} */
		const contextHashes = new Map();
		/** @type {Map<string, FileSystemInfoEntry | "error">} */
		const missingTimestamps = new Map();
		/** @type {Map<string, string | "error">} */
		const managedItemInfo = new Map();

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
				if (missingTimestamps.size !== 0)
					snapshot.missingTimestamps = missingTimestamps;
				if (managedItemInfo.size !== 0)
					snapshot.managedItemInfo = managedItemInfo;
				callback(null, snapshot);
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
								fileHashes.set(path, "error");
							} else {
								fileHashes.set(path, entry);
							}
							jobDone();
						});
					}
				}
			} else {
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
					const cache = this._fileTimestamps.get(path);
					if (cache !== undefined) {
						fileTimestamps.set(path, cache);
					} else {
						jobs++;
						this.fileTimestampQueue.add(path, (err, entry) => {
							if (err) {
								fileTimestamps.set(path, "error");
							} else {
								fileTimestamps.set(path, entry);
							}
							jobDone();
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
								contextHashes.set(path, "error");
							} else {
								contextHashes.set(path, entry);
							}
							jobDone();
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
						contextTimestamps.set(path, cache);
					} else {
						jobs++;
						this.contextTimestampQueue.add(path, (err, entry) => {
							if (err) {
								contextTimestamps.set(path, "error");
							} else {
								contextTimestamps.set(path, entry);
							}
							jobDone();
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
					missingTimestamps.set(path, cache);
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) {
							missingTimestamps.set(path, "error");
						} else {
							missingTimestamps.set(path, entry);
						}
						jobDone();
					});
				}
			}
		}
		for (const path of managedItems) {
			const cache = this._managedItems.get(path);
			if (cache !== undefined) {
				managedItemInfo.set(path, cache || "error");
			} else {
				jobs++;
				this.managedItemQueue.add(path, (err, entry) => {
					if (err || !entry) {
						managedItemInfo.set(path, "error");
					} else {
						managedItemInfo.set(path, entry);
					}
					jobDone();
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
		if (snapshot1.missingTimestamps || snapshot2.missingTimestamps) {
			snapshot.missingTimestamps = mergeMaps(
				snapshot1.missingTimestamps,
				snapshot2.missingTimestamps
			);
		}
		if (snapshot1.managedItemInfo || snapshot2.managedItemInfo) {
			snapshot.managedItemInfo = mergeMaps(
				snapshot1.managedItemInfo,
				snapshot2.managedItemInfo
			);
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
		const callbacks = [callback];
		this._snapshotCache.set(snapshot, callbacks);
		const {
			startTime,
			fileTimestamps,
			fileHashes,
			contextTimestamps,
			contextHashes,
			missingTimestamps,
			managedItemInfo
		} = snapshot;
		let jobs = 1;
		const jobDone = () => {
			if (--jobs === 0) {
				this._snapshotCache.set(snapshot, true);
				for (const callback of callbacks) callback(null, true);
			}
		};
		const invalid = () => {
			if (jobs > 0) {
				jobs = NaN;
				this._snapshotCache.set(snapshot, false);
				for (const callback of callbacks) callback(null, false);
			}
		};
		const checkHash = (current, snap) => {
			if (snap === "error") {
				// If there was an error while snapshotting (i. e. EBUSY)
				// we can't compare further data and assume it's invalid
				return false;
			}
			return current === snap;
		};
		/**
		 * @param {FileSystemInfoEntry} current current entry
		 * @param {FileSystemInfoEntry | "error"} snap entry from snapshot
		 * @returns {boolean} true, if ok
		 */
		const checkExistance = (current, snap) => {
			if (snap === "error") {
				// If there was an error while snapshotting (i. e. EBUSY)
				// we can't compare further data and assume it's invalid
				return false;
			}
			return !current === !snap;
		};
		/**
		 * @param {FileSystemInfoEntry} current current entry
		 * @param {FileSystemInfoEntry | "error"} snap entry from snapshot
		 * @returns {boolean} true, if ok
		 */
		const checkFile = (current, snap) => {
			if (snap === "error") {
				// If there was an error while snapshotting (i. e. EBUSY)
				// we can't compare further data and assume it's invalid
				return false;
			}
			if (current && current.safeTime > startTime) {
				// If a change happened after starting reading the item
				// this may no longer be valid
				return false;
			}
			if (!current !== !snap) {
				// If existance of item differs
				// it's invalid
				return false;
			}
			if (current) {
				// For existing items only
				if (
					snap.timestamp !== undefined &&
					current.timestamp !== snap.timestamp
				) {
					// If we have a timestamp (it was a file or symlink) and it differs from current timestamp
					// it's invalid
					return false;
				}
				if (
					snap.timestampHash !== undefined &&
					current.timestampHash !== snap.timestampHash
				) {
					// If we have a timestampHash (it was a directory) and it differs from current timestampHash
					// it's invalid
					return false;
				}
			}
			return true;
		};
		if (fileTimestamps) {
			for (const [path, ts] of fileTimestamps) {
				const cache = this._fileTimestamps.get(path);
				if (cache !== undefined) {
					if (!checkFile(cache, ts)) {
						invalid();
					}
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkFile(entry, ts)) {
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
					if (!checkHash(cache, hash)) {
						invalid();
					}
				} else {
					jobs++;
					this.fileHashQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkHash(entry, hash)) {
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
					if (!checkFile(cache, ts)) {
						invalid();
					}
				} else {
					jobs++;
					this.contextTimestampQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkFile(entry, ts)) {
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
					if (!checkHash(cache, hash)) {
						invalid();
					}
				} else {
					jobs++;
					this.contextHashQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkHash(entry, hash)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		if (missingTimestamps) {
			for (const [path, ts] of missingTimestamps) {
				const cache = this._fileTimestamps.get(path);
				if (cache !== undefined) {
					if (!checkExistance(cache, ts)) {
						invalid();
					}
				} else {
					jobs++;
					this.fileTimestampQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkExistance(entry, ts)) {
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
					if (!checkHash(cache, info)) {
						invalid();
					}
				} else {
					jobs++;
					this.managedItemQueue.add(path, (err, entry) => {
						if (err) return invalid();
						if (!checkHash(entry, info)) {
							invalid();
						} else {
							jobDone();
						}
					});
				}
			}
		}
		jobDone();
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

			const mtime = +stat.mtime;

			if (mtime) applyMtime(mtime);

			const ts = {
				safeTime: mtime ? mtime + FS_ACCURACY : Infinity,
				timestamp: stat.isDirectory() ? undefined : mtime
			};

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
									return this.managedItemQueue.add(child, (err, info) => {
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
									return this.managedItemQueue.add(child, (err, info) => {
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

	_getManagedItemInfo(path, callback) {
		const packageJsonPath = join(this.fs, path, "package.json");
		this.fs.readFile(packageJsonPath, (err, content) => {
			if (err) {
				if (err.code === "ENOENT" || err.code === "ENOTDIR") {
					// no package.json or path is not a directory
					this._managedItems.set(path, null);
					return callback(null, null);
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
	}

	getDeprecatedFileTimestamps() {
		const map = new Map();
		for (const [path, info] of this._fileTimestamps) {
			if (info) map.set(path, info.safeTime);
		}
		return map;
	}

	getDeprecatedContextTimestamps() {
		const map = new Map();
		for (const [path, info] of this._contextTimestamps) {
			if (info) map.set(path, info.safeTime);
		}
		return map;
	}
}

module.exports = FileSystemInfo;
