// @ts-nocheck
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FileSystemInfo = require("../FileSystemInfo");
const ProgressPlugin = require("../ProgressPlugin");
const LazySet = require("../util/LazySet");
const createHash = require("../util/createHash");
const { createFileSerializer } = require("../util/serialization");
const { CACHE_FORMAT_VERSION, CacheIndex } = require("./format/CacheIndex");
const SegmentManager = require("./format/SegmentManager");

/** @typedef {import("../../declarations/WebpackOptions").SnapshotOptions} SnapshotOptions */
/** @typedef {import("../Cache").Data} Data */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compilation").FileSystemDependencies} FileSystemDependencies */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo").ResolveBuildDependenciesResult} ResolveBuildDependenciesResult */
/** @typedef {import("../FileSystemInfo").ResolveResults} ResolveResults */
/** @typedef {import("../FileSystemInfo").Snapshot} Snapshot */
/** @typedef {import("../logging/Logger").Logger} Logger */
/** @typedef {import("../util/Hash").HashFunction} HashFunction */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

/**
 * @param {string} version version
 * @param {HashFunction} hashFunction hash function
 * @returns {string} effective version
 */
const getEffectiveVersion = (version, hashFunction) => {
	const hash = createHash(hashFunction);
	hash.update(`${CACHE_FORMAT_VERSION}|${version}`);
	return hash.digest("hex");
};

class DiskCacheStrategy {
	/**
	 * @param {object} options options
	 * @param {Compiler} options.compiler the compiler
	 * @param {IntermediateFileSystem} options.fs the filesystem
	 * @param {string} options.context the context directory
	 * @param {string} options.cacheLocation the location of the cache data
	 * @param {string} options.version version identifier
	 * @param {Logger} options.logger a logger
	 * @param {SnapshotOptions} options.snapshot options regarding snapshotting
	 * @param {number} options.maxAge max age of cache items
	 * @param {boolean=} options.profile track detailed timing information
	 * @param {boolean=} options.allowCollectingMemory allow collecting memory
	 * @param {false | "gzip" | "brotli"=} options.compression compression used
	 * @param {boolean=} options.readonly disable storing cache into filesystem
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
		allowCollectingMemory,
		compression,
		readonly
	}) {
		const hashFunction =
			/** @type {HashFunction} */
			(compiler.options.output.hashFunction);
		this.fileSerializer = createFileSerializer(fs, hashFunction);
		this.fileSystemInfo = new FileSystemInfo(fs, {
			managedPaths: snapshot.managedPaths,
			immutablePaths: snapshot.immutablePaths,
			logger: logger.getChildLogger("webpack.FileSystemInfo"),
			hashFunction
		});
		this.compiler = compiler;
		this.fs = fs;
		this.context = context;
		this.cacheLocation = cacheLocation;
		this.version = getEffectiveVersion(version, hashFunction);
		this.logger = logger;
		this.maxAge = maxAge;
		this.profile = profile;
		this.readonly = readonly;
		this.allowCollectingMemory = allowCollectingMemory;
		this.compression = compression;
		this.snapshot = snapshot;
		this.indexFilename = `${cacheLocation}/index.bin`;
		this.segmentManager = new SegmentManager({
			fs,
			fileSerializer: this.fileSerializer,
			cacheLocation,
			compression,
			logger,
			profile,
			maxAge
		});
		/** @type {Set<string>} */
		this.buildDependencies = new Set();
		/** @type {FileSystemDependencies} */
		this.newBuildDependencies = new LazySet();
		/** @type {ResolveResults | undefined} */
		this.resolveResults = undefined;
		/** @type {Snapshot | undefined} */
		this.resolveBuildDependenciesSnapshot = undefined;
		/** @type {Snapshot | undefined} */
		this.buildSnapshot = undefined;
		/** @type {Map<string, { etag: string | null, data: Data }>} */
		this.freshEntries = new Map();
		/** @type {Promise<CacheIndex> | undefined} */
		this.indexPromise = this._openIndex();
		/** @type {Promise<void>} */
		this.storePromise = Promise.resolve();
		/** @type {boolean} */
		this.invalid = false;
	}

	/**
	 * @returns {Promise<CacheIndex>} index
	 */
	_getIndex() {
		if (this.indexPromise === undefined) {
			this.indexPromise = this.storePromise.then(() => this._openIndex());
		}
		return this.indexPromise;
	}

	/**
	 * @returns {Promise<CacheIndex>} index
	 */
	_openIndex() {
		const { logger, indexFilename, version } = this;
		logger.time("restore cache index");
		return this.fileSerializer
			.deserialize(null, {
				filename: indexFilename,
				logger,
				profile: this.profile
			})
			.catch((err) => {
				if (err.code !== "ENOENT") {
					logger.warn(`Restoring filesystem cache index failed: ${err}`);
					logger.debug(err.stack);
				} else {
					logger.debug(`No filesystem cache index exists: ${err}`);
				}
				return undefined;
			})
			.then((index) => {
				logger.timeEnd("restore cache index");
				if (!index) return;
				if (!(index instanceof CacheIndex)) {
					logger.warn(
						"Restored filesystem cache index, but contained content is unexpected."
					);
					return;
				}
				if (index.version !== version) {
					logger.log(
						"Restored filesystem cache index, but version doesn't match."
					);
					return;
				}
				return this._validateBuildDependencies(index).then((valid) =>
					valid ? index : undefined
				);
			})
			.then(async (index) => {
				if (index) {
					this.buildSnapshot = index.buildSnapshot;
					this.buildDependencies = index.buildDependencies;
					this.resolveResults = index.resolveResults;
					this.resolveBuildDependenciesSnapshot =
						index.resolveBuildDependenciesSnapshot;
					await this.segmentManager.sweepOrphans(index);
					return index;
				}
				const fresh = new CacheIndex(version);
				await this.segmentManager.sweepOrphans(fresh);
				return fresh;
			})
			.catch((err) => {
				this.logger.warn(`Restoring filesystem cache failed: ${err}`);
				this.logger.debug(err.stack);
				return new CacheIndex(version);
			});
	}

	/**
	 * @param {CacheIndex} index index
	 * @returns {Promise<boolean>} valid
	 */
	_validateBuildDependencies(index) {
		const logger = this.logger;
		if (
			!index.buildSnapshot ||
			!index.resolveBuildDependenciesSnapshot ||
			!index.resolveResults
		) {
			return Promise.resolve(false);
		}
		logger.time("check build dependencies");
		return Promise.all([
			new Promise((resolve) => {
				this.fileSystemInfo.checkSnapshotValid(
					index.buildSnapshot,
					(err, valid) => {
						if (err) {
							logger.log(
								`Restored filesystem cache, but checking snapshot of build dependencies errored: ${err}.`
							);
							logger.debug(err.stack);
							return resolve(false);
						}
						if (!valid) {
							logger.log(
								"Restored filesystem cache, but build dependencies have changed."
							);
							return resolve(false);
						}
						return resolve(true);
					}
				);
			}),
			new Promise((resolve) => {
				this.fileSystemInfo.checkSnapshotValid(
					index.resolveBuildDependenciesSnapshot,
					(err, valid) => {
						if (err) {
							logger.log(
								`Restored filesystem cache, but checking snapshot of resolving build dependencies errored: ${err}.`
							);
							logger.debug(err.stack);
							return resolve(false);
						}
						if (valid) return resolve(true);
						logger.log(
							"resolving of build dependencies is invalid, will re-resolve build dependencies"
						);
						this.fileSystemInfo.checkResolveResultsValid(
							/** @type {ResolveResults} */
							(index.resolveResults),
							(err, valid) => {
								if (err) {
									logger.log(
										`Restored filesystem cache, but resolving build dependencies errored: ${err}.`
									);
									logger.debug(err.stack);
									return resolve(false);
								}
								if (valid) {
									this.newBuildDependencies.addAll(index.buildDependencies);
									return resolve(true);
								}
								logger.log(
									"Restored filesystem cache, but build dependencies resolve to different locations."
								);
								return resolve(false);
							}
						);
					}
				);
			})
		])
			.then(([buildSnapshotValid, resolveValid]) => {
				logger.timeEnd("check build dependencies");
				return buildSnapshotValid && resolveValid;
			})
			.catch((err) => {
				logger.timeEnd("check build dependencies");
				throw err;
			});
	}

	/**
	 * @param {string} identifier identifier
	 * @param {Etag | null} etag etag
	 * @param {Data} data data
	 * @returns {Promise<void>} promise
	 */
	store(identifier, etag, data) {
		if (this.readonly) return Promise.resolve();
		const stringEtag = etag === null ? null : etag.toString();
		return this._getIndex().then((index) => {
			const oldEntry = index.entries.get(identifier);
			if (oldEntry && oldEntry.segmentId >= 0) {
				const oldSegment = index.segments.get(oldEntry.segmentId);
				if (oldSegment) oldSegment.items.delete(identifier);
			}
			this.freshEntries.set(identifier, { etag: stringEtag, data });
			this.invalid = true;
		});
	}

	/**
	 * @param {string} identifier identifier
	 * @param {Etag | null} etag etag
	 * @returns {Promise<Data>} promise
	 */
	restore(identifier, etag) {
		const stringEtag = etag === null ? null : etag.toString();
		const fresh = this.freshEntries.get(identifier);
		if (fresh) {
			return Promise.resolve(fresh.etag === stringEtag ? fresh.data : null);
		}
		return this._getIndex()
			.then(async (index) => {
				const entry = index.entries.get(identifier);
				if (!entry) return undefined;
				if (entry.etag !== stringEtag) return null;
				entry.lastAccess = Date.now();
				const segment = await this.segmentManager.loadSegment(
					index,
					entry.segmentId
				);
				return segment.get(identifier);
			})
			.catch((err) => {
				if (err && err.code !== "ENOENT") {
					this.logger.warn(
						`Restoring failed for ${identifier} from filesystem cache: ${err}`
					);
					this.logger.debug(err.stack);
				}
			});
	}

	/**
	 * @param {FileSystemDependencies | Iterable<string>} dependencies dependencies
	 * @returns {void}
	 */
	storeBuildDependencies(dependencies) {
		if (this.readonly) return;
		this.newBuildDependencies.addAll(dependencies);
		this.invalid = true;
	}

	/**
	 * @returns {Promise<void>} promise
	 */
	afterAllStored() {
		const indexPromise = this.indexPromise;
		if (indexPromise === undefined) return Promise.resolve();
		const reportProgress = ProgressPlugin.getReporter(this.compiler);
		return (this.storePromise = indexPromise
			.then((index) => {
				if (!this.invalid && this.freshEntries.size === 0) return;
				this.indexPromise = undefined;
				this.logger.log("Storing filesystem cache...");
				return this._captureBuildDependencies(reportProgress).then(async () => {
					if (reportProgress) reportProgress(0.8, "serialize cache");
					this.logger.time("store filesystem cache");
					index.buildSnapshot = this.buildSnapshot;
					index.buildDependencies = new Set(this.buildDependencies);
					index.resolveResults = this.resolveResults;
					index.resolveBuildDependenciesSnapshot =
						this.resolveBuildDependenciesSnapshot;
					await this.segmentManager.persistFreshContent(
						index,
						this.freshEntries
					);
					this.segmentManager.gc(index);
					await this.segmentManager.compactOne(index);
					await this.fileSerializer.serialize(index, {
						filename: this.indexFilename,
						logger: this.logger,
						profile: this.profile
					});
					await this.segmentManager.sweepOrphans(index);
					this.invalid = false;
					this.logger.timeEnd("store filesystem cache");
					this.logger.log(
						"Stored filesystem cache (%d items, %d segments)",
						index.entries.size,
						index.segments.size
					);
				});
			})
			.catch((err) => {
				this.logger.warn(`Caching failed for filesystem cache: ${err}`);
				this.logger.debug(err.stack);
			}));
	}

	/**
	 * @param {((p: number, ...args: string[]) => void) | undefined} reportProgress progress
	 * @returns {Promise<void>} promise
	 */
	_captureBuildDependencies(reportProgress) {
		/** @type {Set<string>} */
		const newBuildDependencies = new Set();
		for (const dep of this.newBuildDependencies) {
			if (!this.buildDependencies.has(dep)) newBuildDependencies.add(dep);
		}
		if (newBuildDependencies.size === 0 && this.buildSnapshot) {
			return Promise.resolve();
		}
		if (reportProgress) reportProgress(0.5, "resolve build dependencies");
		this.logger.debug(
			`Capturing build dependencies... (${[...newBuildDependencies].join(", ")})`
		);
		return new Promise((resolve, reject) => {
			this.logger.time("resolve build dependencies");
			this.fileSystemInfo.resolveBuildDependencies(
				this.context,
				newBuildDependencies,
				(err, result) => {
					this.logger.timeEnd("resolve build dependencies");
					if (err) return reject(err);
					const {
						files,
						directories,
						missing,
						resolveResults,
						resolveDependencies
					} = /** @type {ResolveBuildDependenciesResult} */ (result);
					if (this.resolveResults) {
						for (const [key, value] of resolveResults) {
							this.resolveResults.set(key, value);
						}
					} else {
						this.resolveResults = resolveResults;
					}
					if (reportProgress) {
						reportProgress(0.6, "snapshot build dependencies", "resolving");
					}
					this.logger.time("snapshot build dependencies");
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
							this.resolveBuildDependenciesSnapshot = this
								.resolveBuildDependenciesSnapshot
								? this.fileSystemInfo.mergeSnapshots(
										this.resolveBuildDependenciesSnapshot,
										snapshot
									)
								: snapshot;
							if (reportProgress) {
								reportProgress(0.7, "snapshot build dependencies", "modules");
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
									this.buildSnapshot = this.buildSnapshot
										? this.fileSystemInfo.mergeSnapshots(
												this.buildSnapshot,
												snapshot
											)
										: snapshot;
									for (const dep of newBuildDependencies) {
										this.buildDependencies.add(dep);
									}
									this.newBuildDependencies.clear();
									this.logger.debug("Captured build dependencies");
									resolve();
								}
							);
						}
					);
				}
			);
		});
	}

	clear() {
		this.fileSystemInfo.clear();
		this.buildDependencies.clear();
		this.newBuildDependencies.clear();
		this.resolveBuildDependenciesSnapshot = undefined;
		this.resolveResults = undefined;
		this.buildSnapshot = undefined;
		this.freshEntries.clear();
		this.indexPromise = undefined;
	}
}

module.exports = DiskCacheStrategy;
