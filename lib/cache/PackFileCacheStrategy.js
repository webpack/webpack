/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FileSystemInfo = require("../FileSystemInfo");
const LazySet = require("../util/LazySet");
const makeSerializable = require("../util/makeSerializable");
const {
	createFileSerializer,
	NOT_SERIALIZABLE,
	MEASURE_START_OPERATION,
	MEASURE_END_OPERATION
} = require("../util/serialization");

/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../logging/Logger").Logger} Logger */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

const MAX_INLINE_SIZE = 20000;

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

	serialize({ write }) {
		write(this.version);
		write(this.buildSnapshot);
		write(this.buildDependencies);
		write(this.resolveResults);
		write(this.resolveBuildDependenciesSnapshot);
		write(this.data);
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

class Pack {
	constructor(logger) {
		/** @type {Map<string, string | null>} */
		this.etags = new Map();
		/** @type {Map<string, any | (() => Promise<PackEntry>)>} */
		this.content = new Map();
		this.lastAccess = new Map();
		this.lastSizes = new Map();
		this.unserializable = new Set();
		this.used = new Set();
		this.invalid = false;
		this.logger = logger;
	}

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {string | null} etag etag of the resource
	 * @returns {any} cached content
	 */
	get(identifier, etag) {
		const etagInCache = this.etags.get(identifier);
		if (etagInCache === undefined) return undefined;
		if (etagInCache !== etag) return null;
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

	/**
	 * @param {string} identifier unique name for the resource
	 * @param {string | null} etag etag of the resource
	 * @param {any} data cached content
	 * @returns {void}
	 */
	set(identifier, etag, data) {
		if (this.unserializable.has(identifier)) return;
		this.used.add(identifier);
		if (!this.invalid) {
			if (
				this.content.get(identifier) === data &&
				this.etags.get(identifier) === etag
			) {
				return;
			}
			this.invalid = true;
			this.logger.debug(`Pack got invalid because of ${identifier}`);
		}
		this.etags.set(identifier, etag);
		this.content.set(identifier, data);
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

	_updateLastAccess() {
		const now = Date.now();
		for (const identifier of this.used) {
			this.lastAccess.set(identifier, now);
		}
		this.used.clear();
	}

	serialize({ write }) {
		this._updateLastAccess();
		write(this.etags);
		write(this.unserializable);
		write(this.lastAccess);
		for (const [identifier, data] of this.content) {
			if (this.unserializable.has(identifier)) continue;
			write(identifier);
			if (typeof data === "function") {
				write(data);
			} else {
				const packEntry = new PackEntry(data, identifier);
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

	deserialize({ read, logger }) {
		this.logger = logger;
		this.etags = read();
		this.unserializable = read();
		// Mark the first 1% of the items for retry
		// If they still fail they are added to the back again
		// Eventually all items are retried, but not too many at the same time
		if (this.unserializable.size > 0) {
			let i = Math.ceil(this.unserializable.size / 100);
			for (const item of this.unserializable) {
				this.unserializable.delete(item);
				if (--i <= 0) break;
			}
		}
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
					this.logger.debug(
						`Moved ${identifier} from inline to lazy section for better performance (${(
							size / 1048576
						).toFixed(1)} MiB).`
					);
				}
			} else {
				if (size <= MAX_INLINE_SIZE) {
					this.content.set(identifier, data);
					this.logger.debug(
						`Moved ${identifier} from lazy to inline section for better performance.`
					);
				}
			}
			return data;
		}
	}
}

makeSerializable(Pack, "webpack/lib/cache/PackFileCacheStrategy", "Pack");

class PackEntry {
	constructor(data, identifier) {
		this.data = data;
		this.size = undefined;
		this.identifier = identifier;
	}

	serialize({ write, snapshot, rollback, logger }) {
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
			if (err !== NOT_SERIALIZABLE) {
				logger.warn(
					`Caching failed for ${this.identifier}: ${err}\n` +
						"We will try to cache this entry again once in a while or when the cache file is deleted."
				);
				logger.debug(err.stack);
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

makeSerializable(
	PackEntry,
	"webpack/lib/cache/PackFileCacheStrategy",
	"PackEntry"
);

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
		logger.time("restore pack container");
		return this.fileSerializer
			.deserialize({ filename: `${cacheLocation}.pack`, logger })
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
				logger.timeEnd("restore pack container");
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
								logger.debug(
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
							logger.time("restore pack");
							return packContainer.data().then(d => {
								logger.timeEnd("restore pack");
								return d;
							});
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
					pack.collectGarbage(1000 * 60 * 60 * 24 * 2);
					const content = new PackContainer(
						() => pack,
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
							filename: `${this.cacheLocation}.pack`,
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
