/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const asyncLib = require("neo-async");
const path = require("path");
const {
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");
const { SizeOnlySource } = require("webpack-sources");

const Cache = require("./Cache");
const Compilation = require("./Compilation");
const ConcurrentCompilationError = require("./ConcurrentCompilationError");
const ContextModuleFactory = require("./ContextModuleFactory");
const NormalModuleFactory = require("./NormalModuleFactory");
const RequestShortener = require("./RequestShortener");
const ResolverFactory = require("./ResolverFactory");
const Stats = require("./Stats");
const Watching = require("./Watching");
const { makePathsRelative } = require("./util/identifier");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").Entry} Entry */
/** @typedef {import("../declarations/WebpackOptions").OutputOptions} OutputOptions */
/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */
/** @typedef {import("./Module")} Module */

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
	return keys.sort().reduce((o, k) => {
		o[k] = obj[k];
		return o;
	}, {});
};

class Compiler {
	/**
	 * @param {string} context the compilation path
	 */
	constructor(context) {
		this.hooks = Object.freeze({
			/** @type {SyncBailHook<[Compilation], boolean>} */
			shouldEmit: new SyncBailHook(["compilation"]),
			/** @type {AsyncSeriesHook<[Stats]>} */
			done: new AsyncSeriesHook(["stats"]),
			/** @type {AsyncSeriesHook<[]>} */
			additionalPass: new AsyncSeriesHook([]),
			/** @type {AsyncSeriesHook<[Compiler]>} */
			beforeRun: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<[Compiler]>} */
			run: new AsyncSeriesHook(["compiler"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			emit: new AsyncSeriesHook(["compilation"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			afterEmit: new AsyncSeriesHook(["compilation"]),

			/** @type {SyncHook<[Compilation, CompilationParams]>} */
			thisCompilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<[Compilation, CompilationParams]>} */
			compilation: new SyncHook(["compilation", "params"]),
			/** @type {SyncHook<[NormalModuleFactory]>} */
			normalModuleFactory: new SyncHook(["normalModuleFactory"]),
			/** @type {SyncHook<[ContextModuleFactory]>}  */
			contextModuleFactory: new SyncHook(["contextModulefactory"]),

			/** @type {AsyncSeriesHook<[CompilationParams]>} */
			beforeCompile: new AsyncSeriesHook(["params"]),
			/** @type {SyncHook<[CompilationParams]>} */
			compile: new SyncHook(["params"]),
			/** @type {AsyncParallelHook<[Compilation], Module>} */
			make: new AsyncParallelHook(["compilation"]),
			/** @type {AsyncSeriesHook<[Compilation]>} */
			afterCompile: new AsyncSeriesHook(["compilation"]),

			/** @type {AsyncSeriesHook<[Compiler]>} */
			watchRun: new AsyncSeriesHook(["compiler"]),
			/** @type {SyncHook<[Error]>} */
			failed: new SyncHook(["error"]),
			/** @type {SyncHook<[string, string]>} */
			invalid: new SyncHook(["filename", "changeTime"]),
			/** @type {SyncHook<[]>} */
			watchClose: new SyncHook([]),

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

		/** @type {string=} */
		this.name = undefined;
		/** @type {Compilation=} */
		this.parentCompilation = undefined;
		/** @type {Compiler} */
		this.root = this;
		/** @type {string} */
		this.outputPath = "";

		this.outputFileSystem = null;
		this.inputFileSystem = null;
		this.watchFileSystem = null;

		/** @type {string|null} */
		this.recordsInputPath = null;
		/** @type {string|null} */
		this.recordsOutputPath = null;
		this.records = {};
		/** @type {Set<string>} */
		this.removedFiles = new Set();
		/** @type {Map<string, FileSystemInfoEntry | null>} */
		this.fileTimestamps = new Map();
		/** @type {Map<string, FileSystemInfoEntry | null>} */
		this.contextTimestamps = new Map();
		/** @type {ResolverFactory} */
		this.resolverFactory = new ResolverFactory();

		/** @type {WebpackOptions} */
		this.options = /** @type {WebpackOptions} */ ({});

		this.context = context;

		this.requestShortener = new RequestShortener(context);

		this.cache = new Cache();

		this.compilerPath = "";

		/** @type {boolean} */
		this.running = false;

		/** @type {boolean} */
		this.watchMode = false;

		/** @private @type {WeakMap<Source, { sizeOnlySource: SizeOnlySource, writtenTo: Map<string, number> }>} */
		this._assetEmittingSourceCache = new WeakMap();
		/** @private @type {Map<string, number>} */
		this._assetEmittingWrittenFiles = new Map();
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
		return new Watching(this, watchOptions, handler);
	}

	/**
	 * @param {Callback<Stats>} callback signals when the call finishes
	 * @returns {void}
	 */
	run(callback) {
		if (this.running) {
			return callback(new ConcurrentCompilationError());
		}

		const finalCallback = (err, stats) => {
			this.cache.beginIdle();
			this.running = false;

			if (err) {
				this.hooks.failed.call(err);
			}

			if (callback !== undefined) return callback(err, stats);
		};

		const startTime = Date.now();

		this.running = true;

		const onCompiled = (err, compilation) => {
			if (err) return finalCallback(err);

			if (this.hooks.shouldEmit.call(compilation) === false) {
				const stats = new Stats(compilation);
				stats.startTime = startTime;
				stats.endTime = Date.now();
				this.hooks.done.callAsync(stats, err => {
					if (err) return finalCallback(err);
					return finalCallback(null, stats);
				});
				return;
			}

			process.nextTick(() => {
				this.emitAssets(compilation, err => {
					if (err) return finalCallback(err);

					if (compilation.hooks.needAdditionalPass.call()) {
						compilation.needAdditionalPass = true;

						const stats = new Stats(compilation);
						stats.startTime = startTime;
						stats.endTime = Date.now();
						this.hooks.done.callAsync(stats, err => {
							if (err) return finalCallback(err);

							this.hooks.additionalPass.callAsync(err => {
								if (err) return finalCallback(err);
								this.compile(onCompiled);
							});
						});
						return;
					}

					this.emitRecords(err => {
						if (err) return finalCallback(err);

						const stats = new Stats(compilation);
						stats.startTime = startTime;
						stats.endTime = Date.now();
						this.hooks.done.callAsync(stats, err => {
							if (err) return finalCallback(err);
							return finalCallback(null, stats);
						});
					});
				});
			});
		};

		this.cache.endIdle(err => {
			if (err) return finalCallback(err);

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
		});
	}

	/**
	 * @param {RunAsChildCallback} callback signals when the call finishes
	 * @returns {void}
	 */
	runAsChild(callback) {
		this.compile((err, compilation) => {
			if (err) return callback(err);

			this.parentCompilation.children.push(compilation);
			for (const name of Object.keys(compilation.assets)) {
				this.parentCompilation.assets[name] = compilation.assets[name];
			}

			const entries = Array.from(
				compilation.entrypoints.values(),
				ep => ep.chunks
			).reduce((array, chunks) => {
				return array.concat(chunks);
			}, []);

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

			asyncLib.forEachLimit(
				compilation.assets,
				15,
				(source, file, callback) => {
					let targetFile = file;
					const queryStringIdx = targetFile.indexOf("?");
					if (queryStringIdx >= 0) {
						targetFile = targetFile.substr(0, queryStringIdx);
					}

					const writeOut = err => {
						if (err) return callback(err);
						const targetPath = this.outputFileSystem.join(
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

						// if the target file has already been written
						if (targetFileGeneration !== undefined) {
							// check if the Source has been written to this target file
							const writtenGeneration = cacheEntry.writtenTo.get(targetPath);
							if (writtenGeneration === targetFileGeneration) {
								// if yes, we skip writing the file
								// as it's already there
								// (we assume one doesn't remove files while the Compiler is running)
								return callback();
							}
						}

						// get the binary (Buffer) content from the Source
						/** @type {Buffer} */
						let content;
						if (typeof source.buffer === "function") {
							content = source.buffer();
						} else {
							const bufferOrString = source.source();
							if (Buffer.isBuffer(bufferOrString)) {
								content = bufferOrString;
							} else {
								content = Buffer.from(bufferOrString, "utf8");
							}
						}

						// Create a replacement resource which only allows to ask for size
						// This allows to GC all memory allocated by the Source
						// (expect when the Source is stored in any other cache)
						cacheEntry.sizeOnlySource = new SizeOnlySource(content.length);
						compilation.assets[file] = cacheEntry.sizeOnlySource;

						// Write the file to output file system
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
							callback();
						});
					};

					if (targetFile.match(/\/|\\/)) {
						const dir = path.dirname(targetFile);
						this.outputFileSystem.mkdirp(
							this.outputFileSystem.join(outputPath, dir),
							writeOut
						);
					} else {
						writeOut();
					}
				},
				err => {
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
			this.outputFileSystem.mkdirp(outputPath, emitFiles);
		});
	}

	/**
	 * @param {Callback<void>} callback signals when the call finishes
	 * @returns {void}
	 */
	emitRecords(callback) {
		if (!this.recordsOutputPath) return callback();
		const idx1 = this.recordsOutputPath.lastIndexOf("/");
		const idx2 = this.recordsOutputPath.lastIndexOf("\\");
		let recordsOutputPathDirectory = null;
		if (idx1 > idx2) {
			recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
		} else if (idx1 < idx2) {
			recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
		}

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

		if (!recordsOutputPathDirectory) {
			return writeFile();
		}
		this.outputFileSystem.mkdirp(recordsOutputPathDirectory, err => {
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
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolverFactory = this.resolverFactory;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;
		childCompiler.compilerPath =
			this.compilerPath + "/" + compilerName + compilerIndex;

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

		childCompiler.options = Object.create(this.options);
		childCompiler.options.output = Object.create(childCompiler.options.output);
		for (const name in outputOptions) {
			childCompiler.options.output[name] = outputOptions[name];
		}
		childCompiler.parentCompilation = compilation;
		childCompiler.root = this.root;

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
		return new Compilation(this);
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
		const normalModuleFactory = new NormalModuleFactory(
			this.options.context,
			this.resolverFactory,
			this.options.module || {}
		);
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

			this.hooks.make.callAsync(compilation, err => {
				if (err) return callback(err);

				process.nextTick(() => {
					compilation.finish(err => {
						if (err) return callback(err);

						compilation.seal(err => {
							if (err) return callback(err);

							this.hooks.afterCompile.callAsync(compilation, err => {
								if (err) return callback(err);

								return callback(null, compilation);
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
		this.cache.shutdown(callback);
	}
}

module.exports = Compiler;
