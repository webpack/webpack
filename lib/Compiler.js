/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const asyncLib = require("neo-async");
const {
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");
const { SizeOnlySource } = require("webpack-sources");
const webpack = require("./");
const Cache = require("./Cache");
const CacheFacade = require("./CacheFacade");
const ChunkGraph = require("./ChunkGraph");
const Compilation = require("./Compilation");
const ConcurrentCompilationError = require("./ConcurrentCompilationError");
const ContextModuleFactory = require("./ContextModuleFactory");
const ModuleGraph = require("./ModuleGraph");
const NormalModuleFactory = require("./NormalModuleFactory");
const RequestShortener = require("./RequestShortener");
const ResolverFactory = require("./ResolverFactory");
const Stats = require("./Stats");
const Watching = require("./Watching");
const WebpackError = require("./WebpackError");
const { Logger } = require("./logging/Logger");
const { join, dirname, mkdirp } = require("./util/fs");
const { makePathsRelative } = require("./util/identifier");
const { isSourceEqual } = require("./util/source");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("../declarations/WebpackOptions").OutputNormalized} OutputOptions */
/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */
/** @typedef {import("./util/fs").WatchFileSystem} WatchFileSystem */

/**
 * @typedef {Object} CompilationParams
 * @property {NormalModuleFactory} normalModuleFactory
 * @property {ContextModuleFactory} contextModuleFactory
 */

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} result
 */

/**
 * @callback RunAsChildCallback
 * @param {Error=} err
 * @param {Chunk[]=} entries
 * @param {Compilation=} compilation
 */

/**
 * @typedef {Object} AssetEmittedInfo
 * @property {Buffer} content
 * @property {Source} source
 * @property {Compilation} compilation
 * @property {string} outputPath
 * @property {string} targetPath
 */

/**
 * @param {string[]} array an array
 * @returns {boolean} true, if the array is sorted
 */
const isSorted = array => {
	for (let i = 1; i < array.length; i++) {
		if (array[i - 1] > array[i]) return false;
	}
	return true;
};

/**
 * @param {Object} obj an object
 * @param {string[]} keys the keys of the object
 * @returns {Object} the object with properties sorted by property name
 */
const sortObject = (obj, keys) => {
	const o = {};
	for (const k of keys.sort()) {
		o[k] = obj[k];
	}
	return o;
};

/**
 * @param {string} filename filename
 * @param {string | string[] | undefined} hashes list of hashes
 * @returns {boolean} true, if the filename contains any hash
 */
const includesHash = (filename, hashes) => {
	if (!hashes) return false;
	if (Array.isArray(hashes)) {
		return hashes.some(hash => filename.includes(hash));
	} else {
		return filename.includes(hashes);
	}
};

class Compiler {
	/**
	 * @param {string} context the compilation path
	 */
	constructor(context) {
		this.hooks = Object.freeze({
			/** @type {SyncHook<[]>} */
			initialize: new SyncHook([]),

			/** @type {SyncBailHook<[Compilation], boolean>} */
			shouldEmit: new SyncBailHook(["compilation"]),
			/** @type {AsyncSeriesHook<[Stats]>} */
			done: new AsyncSeriesHook(["stats"]),
			/** @type {SyncHook<[Stats]>} */
			afterDone: new SyncHook(["stats"]),
			/** @type {AsyncSeriesHook<[]>} */
			additionalPass: new AsyncSeriesHook([]),
			/** @type {AsyncSeriesHook<[Compiler]>} */
			beforeRun: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<[Compiler]>} */
			run: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			emit: new AsyncSeriesHook(["compilation"]),
			/** @type {AsyncSeriesHook<[string, AssetEmittedInfo]>} */
			assetEmitted: new AsyncSeriesHook(["file", "info"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			afterEmit: new AsyncSeriesHook(["compilation"]),

			/** @type {SyncHook<[Compilation, CompilationParams]>} */
			thisCompilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<[Compilation, CompilationParams]>} */
			compilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<[NormalModuleFactory]>} */
			normalModuleFactory: new SyncHook(["normalModuleFactory"]),
			/** @type {SyncHook<[ContextModuleFactory]>}  */
			contextModuleFactory: new SyncHook(["contextModuleFactory"]),

			/** @type {AsyncSeriesHook<[CompilationParams]>} */
			beforeCompile: new AsyncSeriesHook(["params"]),
			/** @type {SyncHook<[CompilationParams]>} */
			compile: new SyncHook(["params"]),
			/** @type {AsyncParallelHook<[Compilation]>} */
			make: new AsyncParallelHook(["compilation"]),
			/** @type {AsyncParallelHook<[Compilation]>} */
			finishMake: new AsyncSeriesHook(["compilation"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			afterCompile: new AsyncSeriesHook(["compilation"]),

			/** @type {AsyncSeriesHook<[Compiler]>} */
			watchRun: new AsyncSeriesHook(["compiler"]),
			/** @type {SyncHook<[Error]>} */
			failed: new SyncHook(["error"]),
			/** @type {SyncHook<[string | null, number]>} */
			invalid: new SyncHook(["filename", "changeTime"]),
			/** @type {SyncHook<[]>} */
			watchClose: new SyncHook([]),
			/** @type {AsyncSeriesHook<[]>} */
			shutdown: new AsyncSeriesHook([]),

			/** @type {SyncBailHook<[string, string, any[]], true>} */
			infrastructureLog: new SyncBailHook(["origin", "type", "args"]),

			// TODO the following hooks are weirdly located here
			// TODO move them for webpack 5
			/** @type {SyncHook<[]>} */
			environment: new SyncHook([]),
			/** @type {SyncHook<[]>} */
			afterEnvironment: new SyncHook([]),
			/** @type {SyncHook<[Compiler]>} */
			afterPlugins: new SyncHook(["compiler"]),
			/** @type {SyncHook<[Compiler]>} */
			afterResolvers: new SyncHook(["compiler"]),
			/** @type {SyncBailHook<[string, Entry], boolean>} */
			entryOption: new SyncBailHook(["context", "entry"])
		});

		this.webpack = webpack;

		/** @type {string=} */
		this.name = undefined;
		/** @type {Compilation=} */
		this.parentCompilation = undefined;
		/** @type {Compiler} */
		this.root = this;
		/** @type {string} */
		this.outputPath = "";
		/** @type {Watching} */
		this.watching = undefined;

		/** @type {OutputFileSystem} */
		this.outputFileSystem = null;
		/** @type {IntermediateFileSystem} */
		this.intermediateFileSystem = null;
		/** @type {InputFileSystem} */
		this.inputFileSystem = null;
		/** @type {WatchFileSystem} */
		this.watchFileSystem = null;

		/** @type {string|null} */
		this.recordsInputPath = null;
		/** @type {string|null} */
		this.recordsOutputPath = null;
		this.records = {};
		/** @type {Set<string>} */
		this.managedPaths = new Set();
		/** @type {Set<string>} */
		this.immutablePaths = new Set();

		/** @type {Set<string>} */
		this.modifiedFiles = undefined;
		/** @type {Set<string>} */
		this.removedFiles = undefined;
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this.fileTimestamps = undefined;
		/** @type {Map<string, FileSystemInfoEntry | "ignore" | null>} */
		this.contextTimestamps = undefined;

		/** @type {ResolverFactory} */
		this.resolverFactory = new ResolverFactory();

		this.infrastructureLogger = undefined;

		/** @type {WebpackOptions} */
		this.options = /** @type {WebpackOptions} */ ({});

		this.context = context;

		this.requestShortener = new RequestShortener(context, this.root);

		this.cache = new Cache();

		this.compilerPath = "";

		/** @type {boolean} */
		this.running = false;

		/** @type {boolean} */
		this.idle = false;

		/** @type {boolean} */
		this.watchMode = false;

		/** @type {Compilation} */
		this._lastCompilation = undefined;

		/** @private @type {WeakMap<Source, { sizeOnlySource: SizeOnlySource, writtenTo: Map<string, number> }>} */
		this._assetEmittingSourceCache = new WeakMap();
		/** @private @type {Map<string, number>} */
		this._assetEmittingWrittenFiles = new Map();
	}

	/**
	 * @param {string} name cache name
	 * @returns {CacheFacade} the cache facade instance
	 */
	getCache(name) {
		return new CacheFacade(this.cache, `${this.compilerPath}${name}`);
	}

	/**
	 * @param {string | (function(): string)} name name of the logger, or function called once to get the logger name
	 * @returns {Logger} a logger with that name
	 */
	getInfrastructureLogger(name) {
		if (!name) {
			throw new TypeError(
				"Compiler.getInfrastructureLogger(name) called without a name"
			);
		}
		return new Logger(
			(type, args) => {
				if (typeof name === "function") {
					name = name();
					if (!name) {
						throw new TypeError(
							"Compiler.getInfrastructureLogger(name) called with a function not returning a name"
						);
					}
				}
				if (this.hooks.infrastructureLog.call(name, type, args) === undefined) {
					if (this.infrastructureLogger !== undefined) {
						this.infrastructureLogger(name, type, args);
					}
				}
			},
			childName => {
				if (typeof name === "function") {
					if (typeof childName === "function") {
						return this.getInfrastructureLogger(() => {
							if (typeof name === "function") {
								name = name();
								if (!name) {
									throw new TypeError(
										"Compiler.getInfrastructureLogger(name) called with a function not returning a name"
									);
								}
							}
							if (typeof childName === "function") {
								childName = childName();
								if (!childName) {
									throw new TypeError(
										"Logger.getChildLogger(name) called with a function not returning a name"
									);
								}
							}
							return `${name}/${childName}`;
						});
					} else {
						return this.getInfrastructureLogger(() => {
							if (typeof name === "function") {
								name = name();
								if (!name) {
									throw new TypeError(
										"Compiler.getInfrastructureLogger(name) called with a function not returning a name"
									);
								}
							}
							return `${name}/${childName}`;
						});
					}
				} else {
					if (typeof childName === "function") {
						return this.getInfrastructureLogger(() => {
							if (typeof childName === "function") {
								childName = childName();
								if (!childName) {
									throw new TypeError(
										"Logger.getChildLogger(name) called with a function not returning a name"
									);
								}
							}
							return `${name}/${childName}`;
						});
					} else {
						return this.getInfrastructureLogger(`${name}/${childName}`);
					}
				}
			}
		);
	}

	// TODO webpack 6: solve this in a better way
	// e.g. move compilation specific info from Modules into ModuleGraph
	_cleanupLastCompilation() {
		if (this._lastCompilation !== undefined) {
			for (const module of this._lastCompilation.modules) {
				ChunkGraph.clearChunkGraphForModule(module);
				ModuleGraph.clearModuleGraphForModule(module);
				module.cleanupForCache();
			}
			for (const chunk of this._lastCompilation.chunks) {
				ChunkGraph.clearChunkGraphForChunk(chunk);
			}
			this._lastCompilation = undefined;
		}
	}

	/**
	 * @param {WatchOptions} watchOptions the watcher's options
	 * @param {Callback<Stats>} handler signals when the call finishes
	 * @returns {Watching} a compiler watcher
	 */
	watch(watchOptions, handler) {
		if (this.running) {
			return handler(new ConcurrentCompilationError());
		}

		this.running = true;
		this.watchMode = true;
		this.watching = new Watching(this, watchOptions, handler);
		return this.watching;
	}

	/**
	 * @param {Callback<Stats>} callback signals when the call finishes
	 * @returns {void}
	 */
	run(callback) {
		if (this.running) {
			return callback(new ConcurrentCompilationError());
		}

		let logger;

		const finalCallback = (err, stats) => {
			if (logger) logger.time("beginIdle");
			this.idle = true;
			this.cache.beginIdle();
			this.idle = true;
			if (logger) logger.timeEnd("beginIdle");
			this.running = false;
			if (err) {
				this.hooks.failed.call(err);
			}
			if (callback !== undefined) callback(err, stats);
			this.hooks.afterDone.call(stats);
		};

		const startTime = Date.now();

		this.running = true;

		const onCompiled = (err, compilation) => {
			if (err) return finalCallback(err);

			if (this.hooks.shouldEmit.call(compilation) === false) {
				compilation.startTime = startTime;
				compilation.endTime = Date.now();
				const stats = new Stats(compilation);
				this.hooks.done.callAsync(stats, err => {
					if (err) return finalCallback(err);
					return finalCallback(null, stats);
				});
				return;
			}

			process.nextTick(() => {
				logger = compilation.getLogger("webpack.Compiler");
				logger.time("emitAssets");
				this.emitAssets(compilation, err => {
					logger.timeEnd("emitAssets");
					if (err) return finalCallback(err);

					if (compilation.hooks.needAdditionalPass.call()) {
						compilation.needAdditionalPass = true;

						compilation.startTime = startTime;
						compilation.endTime = Date.now();
						logger.time("done hook");
						const stats = new Stats(compilation);
						this.hooks.done.callAsync(stats, err => {
							logger.timeEnd("done hook");
							if (err) return finalCallback(err);

							this.hooks.additionalPass.callAsync(err => {
								if (err) return finalCallback(err);
								this.compile(onCompiled);
							});
						});
						return;
					}

					logger.time("emitRecords");
					this.emitRecords(err => {
						logger.timeEnd("emitRecords");
						if (err) return finalCallback(err);

						compilation.startTime = startTime;
						compilation.endTime = Date.now();
						logger.time("done hook");
						const stats = new Stats(compilation);
						this.hooks.done.callAsync(stats, err => {
							logger.timeEnd("done hook");
							if (err) return finalCallback(err);
							this.cache.storeBuildDependencies(
								compilation.buildDependencies,
								err => {
									if (err) return finalCallback(err);
									return finalCallback(null, stats);
								}
							);
						});
					});
				});
			});
		};

		const run = () => {
			this.hooks.beforeRun.callAsync(this, err => {
				if (err) return finalCallback(err);

				this.hooks.run.callAsync(this, err => {
					if (err) return finalCallback(err);

					this.readRecords(err => {
						if (err) return finalCallback(err);

						this.compile(onCompiled);
					});
				});
			});
		};

		if (this.idle) {
			this.cache.endIdle(err => {
				if (err) return finalCallback(err);

				this.idle = false;
				run();
			});
		} else {
			run();
		}
	}

	/**
	 * @param {RunAsChildCallback} callback signals when the call finishes
	 * @returns {void}
	 */
	runAsChild(callback) {
		const startTime = Date.now();
		this.compile((err, compilation) => {
			if (err) return callback(err);

			this.parentCompilation.children.push(compilation);
			for (const { name, source, info } of compilation.getAssets()) {
				this.parentCompilation.emitAsset(name, source, info);
			}

			const entries = [];
			for (const ep of compilation.entrypoints.values()) {
				entries.push(...ep.chunks);
			}

			compilation.startTime = startTime;
			compilation.endTime = Date.now();

			return callback(null, entries, compilation);
		});
	}

	purgeInputFileSystem() {
		if (this.inputFileSystem && this.inputFileSystem.purge) {
			this.inputFileSystem.purge();
		}
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @param {Callback<void>} callback signals when the assets are emitted
	 * @returns {void}
	 */
	emitAssets(compilation, callback) {
		let outputPath;

		const emitFiles = err => {
			if (err) return callback(err);

			const assets = compilation.getAssets();
			compilation.assets = { ...compilation.assets };
			/** @type {Map<string, { path: string, source: Source, size: number, waiting: { cacheEntry: any, file: string }[] }>} */
			const caseInsensitiveMap = new Map();
			asyncLib.forEachLimit(
				assets,
				15,
				({ name: file, source, info }, callback) => {
					let targetFile = file;
					let immutable = info.immutable;
					const queryStringIdx = targetFile.indexOf("?");
					if (queryStringIdx >= 0) {
						targetFile = targetFile.substr(0, queryStringIdx);
						// We may remove the hash, which is in the query string
						// So we recheck if the file is immutable
						// This doesn't cover all cases, but immutable is only a performance optimization anyway
						immutable =
							immutable &&
							(includesHash(targetFile, info.contenthash) ||
								includesHash(targetFile, info.chunkhash) ||
								includesHash(targetFile, info.modulehash) ||
								includesHash(targetFile, info.fullhash));
					}

					const writeOut = err => {
						if (err) return callback(err);
						const targetPath = join(
							this.outputFileSystem,
							outputPath,
							targetFile
						);

						// check if the target file has already been written by this Compiler
						const targetFileGeneration = this._assetEmittingWrittenFiles.get(
							targetPath
						);

						// create an cache entry for this Source if not already existing
						let cacheEntry = this._assetEmittingSourceCache.get(source);
						if (cacheEntry === undefined) {
							cacheEntry = {
								sizeOnlySource: undefined,
								writtenTo: new Map()
							};
							this._assetEmittingSourceCache.set(source, cacheEntry);
						}

						let similarEntry;

						const checkSimilarFile = () => {
							const caseInsensitiveTargetPath = targetPath.toLowerCase();
							similarEntry = caseInsensitiveMap.get(caseInsensitiveTargetPath);
							if (similarEntry !== undefined) {
								const { path: other, source: otherSource } = similarEntry;
								if (isSourceEqual(otherSource, source)) {
									// Size may or may not be available at this point.
									// If it's not available add to "waiting" list and it will be updated once available
									if (similarEntry.size !== undefined) {
										updateWithReplacementSource(similarEntry.size);
									} else {
										if (!similarEntry.waiting) similarEntry.waiting = [];
										similarEntry.waiting.push({ file, cacheEntry });
									}
									alreadyWritten();
								} else {
									const err = new WebpackError(`Prevent writing to file that only differs in casing or query string from already written file.
This will lead to a race-condition and corrupted files on case-insensitive file systems.
${targetPath}
${other}`);
									err.file = file;
									callback(err);
								}
								return true;
							} else {
								caseInsensitiveMap.set(
									caseInsensitiveTargetPath,
									(similarEntry = {
										path: targetPath,
										source,
										size: undefined,
										waiting: undefined
									})
								);
								return false;
							}
						};

						/**
						 * get the binary (Buffer) content from the Source
						 * @returns {Buffer} content for the source
						 */
						const getContent = () => {
							if (typeof source.buffer === "function") {
								return source.buffer();
							} else {
								const bufferOrString = source.source();
								if (Buffer.isBuffer(bufferOrString)) {
									return bufferOrString;
								} else {
									return Buffer.from(bufferOrString, "utf8");
								}
							}
						};

						const alreadyWritten = () => {
							// cache the information that the Source has been already been written to that location
							if (targetFileGeneration === undefined) {
								const newGeneration = 1;
								this._assetEmittingWrittenFiles.set(targetPath, newGeneration);
								cacheEntry.writtenTo.set(targetPath, newGeneration);
							} else {
								cacheEntry.writtenTo.set(targetPath, targetFileGeneration);
							}
							callback();
						};

						/**
						 * Write the file to output file system
						 * @param {Buffer} content content to be written
						 * @returns {void}
						 */
						const doWrite = content => {
							this.outputFileSystem.writeFile(targetPath, content, err => {
								if (err) return callback(err);

								// information marker that the asset has been emitted
								compilation.emittedAssets.add(file);

								// cache the information that the Source has been written to that location
								const newGeneration =
									targetFileGeneration === undefined
										? 1
										: targetFileGeneration + 1;
								cacheEntry.writtenTo.set(targetPath, newGeneration);
								this._assetEmittingWrittenFiles.set(targetPath, newGeneration);
								this.hooks.assetEmitted.callAsync(
									file,
									{
										content,
										source,
										outputPath,
										compilation,
										targetPath
									},
									callback
								);
							});
						};

						const updateWithReplacementSource = size => {
							updateFileWithReplacementSource(file, cacheEntry, size);
							similarEntry.size = size;
							if (similarEntry.waiting !== undefined) {
								for (const { file, cacheEntry } of similarEntry.waiting) {
									updateFileWithReplacementSource(file, cacheEntry, size);
								}
							}
						};

						const updateFileWithReplacementSource = (
							file,
							cacheEntry,
							size
						) => {
							// Create a replacement resource which only allows to ask for size
							// This allows to GC all memory allocated by the Source
							// (expect when the Source is stored in any other cache)
							if (!cacheEntry.sizeOnlySource) {
								cacheEntry.sizeOnlySource = new SizeOnlySource(size);
							}
							compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
								size
							});
						};

						const processExistingFile = stats => {
							// skip emitting if it's already there and an immutable file
							if (immutable) {
								updateWithReplacementSource(stats.size);
								return alreadyWritten();
							}

							const content = getContent();

							updateWithReplacementSource(content.length);

							// if it exists and content on disk matches content
							// skip writing the same content again
							// (to keep mtime and don't trigger watchers)
							// for a fast negative match file size is compared first
							if (content.length === stats.size) {
								compilation.comparedForEmitAssets.add(file);
								return this.outputFileSystem.readFile(
									targetPath,
									(err, existingContent) => {
										if (
											err ||
											!content.equals(/** @type {Buffer} */ (existingContent))
										) {
											return doWrite(content);
										} else {
											return alreadyWritten();
										}
									}
								);
							}

							return doWrite(content);
						};

						const processMissingFile = () => {
							const content = getContent();

							updateWithReplacementSource(content.length);

							return doWrite(content);
						};

						// if the target file has already been written
						if (targetFileGeneration !== undefined) {
							// check if the Source has been written to this target file
							const writtenGeneration = cacheEntry.writtenTo.get(targetPath);
							if (writtenGeneration === targetFileGeneration) {
								// if yes, we skip writing the file
								// as it's already there
								// (we assume one doesn't remove files while the Compiler is running)

								compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
									size: cacheEntry.sizeOnlySource.size()
								});

								return callback();
							}

							if (!immutable) {
								if (checkSimilarFile()) return;
								// We wrote to this file before which has very likely a different content
								// skip comparing and assume content is different for performance
								// This case happens often during watch mode.
								return processMissingFile();
							}
						}

						if (checkSimilarFile()) return;
						if (this.options.output.compareBeforeEmit) {
							this.outputFileSystem.stat(targetPath, (err, stats) => {
								const exists = !err && stats.isFile();

								if (exists) {
									processExistingFile(stats);
								} else {
									processMissingFile();
								}
							});
						} else {
							processMissingFile();
						}
					};

					if (targetFile.match(/\/|\\/)) {
						const fs = this.outputFileSystem;
						const dir = dirname(fs, join(fs, outputPath, targetFile));
						mkdirp(fs, dir, writeOut);
					} else {
						writeOut();
					}
				},
				err => {
					// Clear map to free up memory
					caseInsensitiveMap.clear();
					if (err) return callback(err);

					this.hooks.afterEmit.callAsync(compilation, err => {
						if (err) return callback(err);

						return callback();
					});
				}
			);
		};

		this.hooks.emit.callAsync(compilation, err => {
			if (err) return callback(err);
			outputPath = compilation.getPath(this.outputPath, {});
			mkdirp(this.outputFileSystem, outputPath, emitFiles);
		});
	}

	/**
	 * @param {Callback<void>} callback signals when the call finishes
	 * @returns {void}
	 */
	emitRecords(callback) {
		if (!this.recordsOutputPath) return callback();

		const writeFile = () => {
			this.outputFileSystem.writeFile(
				this.recordsOutputPath,
				JSON.stringify(
					this.records,
					(n, value) => {
						if (
							typeof value === "object" &&
							value !== null &&
							!Array.isArray(value)
						) {
							const keys = Object.keys(value);
							if (!isSorted(keys)) {
								return sortObject(value, keys);
							}
						}
						return value;
					},
					2
				),
				callback
			);
		};

		const recordsOutputPathDirectory = dirname(
			this.outputFileSystem,
			this.recordsOutputPath
		);
		if (!recordsOutputPathDirectory) {
			return writeFile();
		}
		mkdirp(this.outputFileSystem, recordsOutputPathDirectory, err => {
			if (err) return callback(err);
			writeFile();
		});
	}

	/**
	 * @param {Callback<void>} callback signals when the call finishes
	 * @returns {void}
	 */
	readRecords(callback) {
		if (!this.recordsInputPath) {
			this.records = {};
			return callback();
		}
		this.inputFileSystem.stat(this.recordsInputPath, err => {
			// It doesn't exist
			// We can ignore this.
			if (err) return callback();

			this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
				if (err) return callback(err);

				try {
					this.records = parseJson(content.toString("utf-8"));
				} catch (e) {
					e.message = "Cannot parse records: " + e.message;
					return callback(e);
				}

				return callback();
			});
		});
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @param {string} compilerName the compiler's name
	 * @param {number} compilerIndex the compiler's index
	 * @param {OutputOptions} outputOptions the output options
	 * @param {WebpackPluginInstance[]} plugins the plugins to apply
	 * @returns {Compiler} a child compiler
	 */
	createChildCompiler(
		compilation,
		compilerName,
		compilerIndex,
		outputOptions,
		plugins
	) {
		const childCompiler = new Compiler(this.context);
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolverFactory = this.resolverFactory;
		childCompiler.modifiedFiles = this.modifiedFiles;
		childCompiler.removedFiles = this.removedFiles;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;
		childCompiler.cache = this.cache;
		childCompiler.compilerPath = `${this.compilerPath}${compilerName}|${compilerIndex}|`;

		const relativeCompilerName = makePathsRelative(
			this.context,
			compilerName,
			this.root
		);
		if (!this.records[relativeCompilerName]) {
			this.records[relativeCompilerName] = [];
		}
		if (this.records[relativeCompilerName][compilerIndex]) {
			childCompiler.records = this.records[relativeCompilerName][compilerIndex];
		} else {
			this.records[relativeCompilerName].push((childCompiler.records = {}));
		}

		childCompiler.options = {
			...this.options,
			output: {
				...this.options.output,
				...outputOptions
			}
		};
		childCompiler.parentCompilation = compilation;
		childCompiler.root = this.root;
		if (Array.isArray(plugins)) {
			for (const plugin of plugins) {
				plugin.apply(childCompiler);
			}
		}
		for (const name in this.hooks) {
			if (
				![
					"make",
					"compile",
					"emit",
					"afterEmit",
					"invalid",
					"done",
					"thisCompilation"
				].includes(name)
			) {
				if (childCompiler.hooks[name]) {
					childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
				}
			}
		}

		compilation.hooks.childCompiler.call(
			childCompiler,
			compilerName,
			compilerIndex
		);

		return childCompiler;
	}

	isChild() {
		return !!this.parentCompilation;
	}

	createCompilation() {
		this._cleanupLastCompilation();
		return (this._lastCompilation = new Compilation(this));
	}

	/**
	 * @param {CompilationParams} params the compilation parameters
	 * @returns {Compilation} the created compilation
	 */
	newCompilation(params) {
		const compilation = this.createCompilation();
		compilation.name = this.name;
		compilation.records = this.records;
		this.hooks.thisCompilation.call(compilation, params);
		this.hooks.compilation.call(compilation, params);
		return compilation;
	}

	createNormalModuleFactory() {
		const normalModuleFactory = new NormalModuleFactory({
			context: this.options.context,
			fs: this.inputFileSystem,
			resolverFactory: this.resolverFactory,
			options: this.options.module,
			associatedObjectForCache: this.root,
			layers: this.options.experiments.layers
		});
		this.hooks.normalModuleFactory.call(normalModuleFactory);
		return normalModuleFactory;
	}

	createContextModuleFactory() {
		const contextModuleFactory = new ContextModuleFactory(this.resolverFactory);
		this.hooks.contextModuleFactory.call(contextModuleFactory);
		return contextModuleFactory;
	}

	newCompilationParams() {
		const params = {
			normalModuleFactory: this.createNormalModuleFactory(),
			contextModuleFactory: this.createContextModuleFactory()
		};
		return params;
	}

	/**
	 * @param {Callback<Compilation>} callback signals when the compilation finishes
	 * @returns {void}
	 */
	compile(callback) {
		const params = this.newCompilationParams();
		this.hooks.beforeCompile.callAsync(params, err => {
			if (err) return callback(err);

			this.hooks.compile.call(params);

			const compilation = this.newCompilation(params);

			const logger = compilation.getLogger("webpack.Compiler");

			logger.time("make hook");
			this.hooks.make.callAsync(compilation, err => {
				logger.timeEnd("make hook");
				if (err) return callback(err);

				logger.time("finish make hook");
				this.hooks.finishMake.callAsync(compilation, err => {
					logger.timeEnd("finish make hook");
					if (err) return callback(err);

					process.nextTick(() => {
						logger.time("finish compilation");
						compilation.finish(err => {
							logger.timeEnd("finish compilation");
							if (err) return callback(err);

							logger.time("seal compilation");
							compilation.seal(err => {
								logger.timeEnd("seal compilation");
								if (err) return callback(err);

								logger.time("afterCompile hook");
								this.hooks.afterCompile.callAsync(compilation, err => {
									logger.timeEnd("afterCompile hook");
									if (err) return callback(err);

									return callback(null, compilation);
								});
							});
						});
					});
				});
			});
		});
	}

	/**
	 * @param {Callback<void>} callback signals when the compiler closes
	 * @returns {void}
	 */
	close(callback) {
		this.hooks.shutdown.callAsync(err => {
			if (err) return callback(err);
			// Get rid of reference to last compilation to avoid leaking memory
			// We can't run this._cleanupLastCompilation() as the Stats to this compilation
			// might be still in use. We try to get rid for the reference to the cache instead.
			this._lastCompilation = undefined;
			this.cache.shutdown(callback);
		});
	}
}

module.exports = Compiler;
