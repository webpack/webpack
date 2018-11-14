/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const {
	HookMap,
	SyncHook,
	SyncBailHook,
	SyncWaterfallHook,
	AsyncSeriesHook
} = require("tapable");
const util = require("util");
const { CachedSource } = require("webpack-sources");
const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const Chunk = require("./Chunk");
const ChunkGraph = require("./ChunkGraph");
const ChunkGroup = require("./ChunkGroup");
const ChunkRenderError = require("./ChunkRenderError");
const ChunkTemplate = require("./ChunkTemplate");
const DependencyTemplates = require("./DependencyTemplates");
const Entrypoint = require("./Entrypoint");
const FileSystemInfo = require("./FileSystemInfo");
const {
	connectChunkGroupAndChunk,
	connectChunkGroupParentAndChild
} = require("./GraphHelpers");
const HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");
const MainTemplate = require("./MainTemplate");
const ModuleDependencyError = require("./ModuleDependencyError");
const ModuleDependencyWarning = require("./ModuleDependencyWarning");
const ModuleGraph = require("./ModuleGraph");
const ModuleNotFoundError = require("./ModuleNotFoundError");
const ModuleProfile = require("./ModuleProfile");
const ModuleRestoreError = require("./ModuleRestoreError");
const ModuleTemplate = require("./ModuleTemplate");
const RuntimeTemplate = require("./RuntimeTemplate");
const Stats = require("./Stats");
const compareLocations = require("./compareLocations");
const AsyncQueue = require("./util/AsyncQueue");
const Queue = require("./util/Queue");
const SortableSet = require("./util/SortableSet");
const {
	concatComparators,
	compareSelect,
	compareIds,
	compareStringsNumeric
} = require("./util/comparators");
const createHash = require("./util/createHash");
const { arrayToSetDeprecation } = require("./util/deprecation");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./DependencyTemplate")} DependencyTemplate */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./RuntimeModule")} RuntimeModule */
/** @typedef {import("./Template").RenderManifestEntry} RenderManifestEntry */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./dependencies/DependencyReference")} DependencyReference */
/** @typedef {import("./dependencies/DllEntryDependency")} DllEntryDependency */
/** @typedef {import("./dependencies/EntryDependency")} EntryDependency */
/** @typedef {import("./util/createHash").Hash} Hash */

// TODO use @callback
/** @typedef {{[assetName: string]: Source}} CompilationAssets */
/** @typedef {(err?: WebpackError|null, result?: Module) => void } ModuleCallback */
/** @typedef {(err?: Error|null) => void} Callback */
/** @typedef {(d: Dependency) => any} DepBlockVarDependenciesCallback */
/** @typedef {new (...args: any[]) => Dependency} DepConstructor */
/** @typedef {{apply: () => void}} Plugin */

/**
 * @typedef {Object} ModuleFactoryCreateDataContextInfo
 * @property {string} issuer
 * @property {string} compiler
 */

/**
 * @typedef {Object} ModuleFactoryCreateData
 * @property {ModuleFactoryCreateDataContextInfo} contextInfo
 * @property {any=} resolveOptions
 * @property {string} context
 * @property {Dependency[]} dependencies
 */

/**
 * @typedef {Object} ModuleFactory
 * @property {(data: ModuleFactoryCreateData, callback: ModuleCallback) => any} create
 */

/**
 * @typedef {Object} AvailableModulesChunkGroupMapping
 * @property {ChunkGroup} chunkGroup
 * @property {Set<Module>} availableModules
 * @property {boolean} needCopy
 */

/**
 * @typedef {Object} DependenciesBlockLike
 * @property {Dependency[]} dependencies
 * @property {AsyncDependenciesBlock[]} blocks
 */

/**
 * @typedef {Object} ChunkPathData
 * @property {string|number} id
 * @property {string=} name
 * @property {string} hash
 * @property {string} renderedHash
 * @property {function(number): string=} hashWithLength
 * @property {(Record<string, string>)=} contentHash
 * @property {(Record<string, (length: number) => string>)=} contentHashWithLength
 */

/**
 * @typedef {Object} ModulePathData
 * @property {string|number} id
 * @property {string} hash
 * @property {string} renderedHash
 * @property {function(number): string=} hashWithLength
 */

/**
 * @typedef {Object} PathData
 * @property {ChunkGraph=} chunkGraph
 * @property {string=} hash
 * @property {function(number): string=} hashWithLength
 * @property {(Chunk|ChunkPathData)=} chunk
 * @property {(Module|ModulePathData)=} module
 * @property {string=} filename
 * @property {string=} basename
 * @property {string=} query
 * @property {string=} contentHashType
 * @property {string=} contentHash
 * @property {function(number): string=} contentHashWithLength
 * @property {boolean=} noChunkHash
 */

// TODO webpack 6: remove
const deprecatedNormalModuleLoaderHook = util.deprecate(compilation => {
	return require("./NormalModule").getCompilationHooks(compilation).loader;
}, "Compilation.hooks.normalModuleLoader was moved to NormalModule.getCompilationHooks(compilation).loader");

const byId = compareSelect(
	/**
	 * @param {Chunk} c chunk
	 * @returns {number | string} id
	 */ c => c.id,
	compareIds
);

const byNameOrHash = concatComparators(
	compareSelect(
		/**
		 * @param {Compilation} c compilation
		 * @returns {string} name
		 */
		c => c.name,
		compareIds
	),
	compareSelect(
		/**
		 * @param {Compilation} c compilation
		 * @returns {string} hash
		 */ c => c.fullHash,
		compareIds
	)
);

/**
 * @template T
 * @param {Set<T>} a first set
 * @param {Set<T>} b second set
 * @returns {number} cmp
 */
const bySetSize = (a, b) => {
	return a.size - b.size;
};

/**
 * @template T
 * @param {T[]} arr array of elements to iterate over
 * @param {function(T): void} fn callback applied to each element
 * @returns {void}
 */
const iterationOfArrayCallback = (arr, fn) => {
	for (let index = 0; index < arr.length; index++) {
		fn(arr[index]);
	}
};

/**
 * @template T
 * @param {Set<T>} set set to add items to
 * @param {Set<T>} otherSet set to add items from
 * @returns {void}
 */
const addAllToSet = (set, otherSet) => {
	for (const item of otherSet) {
		set.add(item);
	}
};

class Compilation {
	/**
	 * Creates an instance of Compilation.
	 * @param {Compiler} compiler the compiler which created the compilation
	 */
	constructor(compiler) {
		const getNormalModuleLoader = () => deprecatedNormalModuleLoaderHook(this);
		this.hooks = Object.freeze({
			/** @type {SyncHook<Module>} */
			buildModule: new SyncHook(["module"]),
			/** @type {SyncHook<Module>} */
			rebuildModule: new SyncHook(["module"]),
			/** @type {SyncHook<Module, WebpackError>} */
			failedModule: new SyncHook(["module", "error"]),
			/** @type {SyncHook<Module>} */
			succeedModule: new SyncHook(["module"]),

			/** @type {SyncHook<Dependency, string>} */
			addEntry: new SyncHook(["entry", "name"]),
			/** @type {SyncHook<Dependency, string, Error>} */
			failedEntry: new SyncHook(["entry", "name", "error"]),
			/** @type {SyncHook<Dependency, string, Module>} */
			succeedEntry: new SyncHook(["entry", "name", "module"]),

			/** @type {SyncWaterfallHook<DependencyReference, Dependency, Module>} */
			dependencyReference: new SyncWaterfallHook([
				"dependencyReference",
				"dependency",
				"module"
			]),

			/** @type {SyncHook<Iterable<Module>>} */
			finishModules: new SyncHook(["modules"]),
			/** @type {SyncHook<Module>} */
			finishRebuildingModule: new SyncHook(["module"]),
			/** @type {SyncHook} */
			unseal: new SyncHook([]),
			/** @type {SyncHook} */
			seal: new SyncHook([]),

			/** @type {SyncHook} */
			beforeChunks: new SyncHook([]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			afterChunks: new SyncHook(["chunks"]),

			/** @type {SyncBailHook<Iterable<Module>>} */
			optimizeDependencies: new SyncBailHook(["modules"]),
			/** @type {SyncBailHook<Iterable<Module>>} */
			afterOptimizeDependencies: new SyncHook(["modules"]),

			/** @type {SyncHook} */
			optimize: new SyncHook([]),
			/** @type {SyncBailHook<Iterable<Module>>} */
			optimizeModules: new SyncBailHook(["modules"]),
			/** @type {SyncHook<Iterable<Module>>} */
			afterOptimizeModules: new SyncHook(["modules"]),

			/** @type {SyncBailHook<Iterable<Chunk>, ChunkGroup[]>} */
			optimizeChunks: new SyncBailHook(["chunks", "chunkGroups"]),
			/** @type {SyncHook<Iterable<Chunk>, ChunkGroup[]>} */
			afterOptimizeChunks: new SyncHook(["chunks", "chunkGroups"]),

			/** @type {AsyncSeriesHook<Iterable<Chunk>, Iterable<Module>>} */
			optimizeTree: new AsyncSeriesHook(["chunks", "modules"]),
			/** @type {SyncHook<Iterable<Chunk>, Iterable<Module>>} */
			afterOptimizeTree: new SyncHook(["chunks", "modules"]),

			/** @type {SyncBailHook<Iterable<Chunk>, Iterable<Module>>} */
			optimizeChunkModules: new SyncBailHook(["chunks", "modules"]),
			/** @type {SyncHook<Iterable<Chunk>, Iterable<Module>>} */
			afterOptimizeChunkModules: new SyncHook(["chunks", "modules"]),
			/** @type {SyncBailHook} */
			shouldRecord: new SyncBailHook([]),

			/** @type {SyncHook<Chunk>} */
			additionalChunkRuntimeRequirements: new SyncHook([
				"chunk",
				"runtimeRequirements"
			]),
			runtimeRequirementInChunk: new HookMap(
				() => new SyncBailHook(["chunk", "runtimeRequirements"])
			),
			/** @type {SyncHook<Chunk>} */
			additionalTreeRuntimeRequirements: new SyncHook([
				"chunk",
				"runtimeRequirements"
			]),
			runtimeRequirementInTree: new HookMap(
				() => new SyncBailHook(["chunk", "runtimeRequirements"])
			),

			/** @type {SyncHook<RuntimeModule, Chunk>} */
			runtimeModule: new SyncHook(["module", "chunk"]),

			/** @type {SyncHook<Iterable<Module>, any>} */
			reviveModules: new SyncHook(["modules", "records"]),
			/** @type {SyncHook<Iterable<Module>>} */
			beforeModuleIds: new SyncHook(["modules"]),
			/** @type {SyncHook<Iterable<Module>>} */
			moduleIds: new SyncHook(["modules"]),
			/** @type {SyncHook<Iterable<Module>>} */
			optimizeModuleIds: new SyncHook(["modules"]),
			/** @type {SyncHook<Iterable<Module>>} */
			afterOptimizeModuleIds: new SyncHook(["modules"]),

			/** @type {SyncHook<Iterable<Chunk>, any>} */
			reviveChunks: new SyncHook(["chunks", "records"]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			beforeChunkIds: new SyncHook(["chunks"]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			chunkIds: new SyncHook(["chunks"]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			optimizeChunkIds: new SyncHook(["chunks"]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			afterOptimizeChunkIds: new SyncHook(["chunks"]),

			/** @type {SyncHook<Iterable<Module>, any>} */
			recordModules: new SyncHook(["modules", "records"]),
			/** @type {SyncHook<Iterable<Chunk>, any>} */
			recordChunks: new SyncHook(["chunks", "records"]),

			/** @type {SyncHook} */
			beforeModuleHash: new SyncHook([]),
			/** @type {SyncHook} */
			afterModuleHash: new SyncHook([]),

			/** @type {SyncHook} */
			beforeRuntimeRequirements: new SyncHook([]),
			/** @type {SyncHook} */
			afterRuntimeRequirements: new SyncHook([]),

			/** @type {SyncHook} */
			beforeHash: new SyncHook([]),
			/** @type {SyncHook<Chunk>} */
			contentHash: new SyncHook(["chunk"]),
			/** @type {SyncHook} */
			afterHash: new SyncHook([]),
			/** @type {SyncHook<any>} */
			recordHash: new SyncHook(["records"]),
			/** @type {SyncHook<Compilation, any>} */
			record: new SyncHook(["compilation", "records"]),

			/** @type {SyncHook} */
			beforeModuleAssets: new SyncHook([]),
			/** @type {SyncBailHook} */
			shouldGenerateChunkAssets: new SyncBailHook([]),
			/** @type {SyncHook} */
			beforeChunkAssets: new SyncHook([]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			additionalChunkAssets: new SyncHook(["chunks"]),

			/** @type {AsyncSeriesHook} */
			additionalAssets: new AsyncSeriesHook([]),
			/** @type {AsyncSeriesHook<Iterable<Chunk>>} */
			optimizeChunkAssets: new AsyncSeriesHook(["chunks"]),
			/** @type {SyncHook<Iterable<Chunk>>} */
			afterOptimizeChunkAssets: new SyncHook(["chunks"]),
			/** @type {AsyncSeriesHook<CompilationAssets>} */
			optimizeAssets: new AsyncSeriesHook(["assets"]),
			/** @type {SyncHook<CompilationAssets>} */
			afterOptimizeAssets: new SyncHook(["assets"]),

			/** @type {SyncBailHook} */
			needAdditionalSeal: new SyncBailHook([]),
			/** @type {AsyncSeriesHook} */
			afterSeal: new AsyncSeriesHook([]),

			/** @type {SyncHook<Chunk, Hash>} */
			chunkHash: new SyncHook(["chunk", "chunkHash"]),
			/** @type {SyncHook<Module, string>} */
			moduleAsset: new SyncHook(["module", "filename"]),
			/** @type {SyncHook<Chunk, string>} */
			chunkAsset: new SyncHook(["chunk", "filename"]),

			/** @type {SyncWaterfallHook<string, TODO>} */
			assetPath: new SyncWaterfallHook(["filename", "data"]), // TODO MainTemplate

			/** @type {SyncBailHook} */
			needAdditionalPass: new SyncBailHook([]),

			/** @type {SyncHook<Compiler, string, number>} */
			childCompiler: new SyncHook([
				"childCompiler",
				"compilerName",
				"compilerIndex"
			]),

			get normalModuleLoader() {
				return getNormalModuleLoader();
			}
		});
		/** @type {string=} */
		this.name = undefined;
		/** @type {Compiler} */
		this.compiler = compiler;
		this.resolverFactory = compiler.resolverFactory;
		this.inputFileSystem = compiler.inputFileSystem;
		this.fileSystemInfo = new FileSystemInfo(this.inputFileSystem);
		if (compiler.fileTimestamps) {
			this.fileSystemInfo.addFileTimestamps(compiler.fileTimestamps);
		}
		if (compiler.contextTimestamps) {
			this.fileSystemInfo.addContextTimestamps(compiler.contextTimestamps);
		}
		this.requestShortener = compiler.requestShortener;
		this.compilerPath = compiler.compilerPath;
		this.cache = compiler.cache;

		const options = compiler.options;
		this.options = options;
		this.outputOptions = options && options.output;
		/** @type {boolean} */
		this.bail = (options && options.bail) || false;
		/** @type {boolean} */
		this.profile = (options && options.profile) || false;

		this.mainTemplate = new MainTemplate(this.outputOptions);
		this.chunkTemplate = new ChunkTemplate(this.outputOptions);
		this.hotUpdateChunkTemplate = new HotUpdateChunkTemplate(
			this.outputOptions
		);
		this.runtimeTemplate = new RuntimeTemplate(
			this.outputOptions,
			this.requestShortener
		);
		/** @type {{javascript: ModuleTemplate, webassembly: ModuleTemplate}} */
		this.moduleTemplates = {
			javascript: new ModuleTemplate(this.runtimeTemplate, "javascript"),
			webassembly: new ModuleTemplate(this.runtimeTemplate, "webassembly")
		};

		this.moduleGraph = new ModuleGraph();
		this.chunkGraph = undefined;

		/** @type {AsyncQueue<TODO, TODO, Module>} */
		this.factorizeQueue = new AsyncQueue({
			name: "factorize",
			parallelism: options.parallelism || 100,
			processor: this._factorizeModule.bind(this)
		});
		/** @type {AsyncQueue<Module, string, Module>} */
		this.addModuleQueue = new AsyncQueue({
			name: "addModule",
			parallelism: options.parallelism || 100,
			getKey: module => module.identifier(),
			processor: this._addModule.bind(this)
		});
		/** @type {AsyncQueue<Module, Module, Module>} */
		this.buildQueue = new AsyncQueue({
			name: "build",
			parallelism: options.parallelism || 100,
			processor: this._buildModule.bind(this)
		});
		/** @type {AsyncQueue<Module, Module, Module>} */
		this.rebuildQueue = new AsyncQueue({
			name: "rebuild",
			parallelism: options.parallelism || 100,
			processor: this._rebuildModule.bind(this)
		});
		/** @type {AsyncQueue<Module, Module, Module>} */
		this.processDependenciesQueue = new AsyncQueue({
			name: "processDependencies",
			parallelism: options.parallelism || 100,
			processor: this._processModuleDependencies.bind(this)
		});

		/** @type {Map<string, EntryDependency[]>} */
		this.entryDependencies = new Map();
		/** @type {Map<string, Entrypoint>} */
		this.entrypoints = new Map();
		/** @type {Set<Chunk>} */
		this.chunks = new Set();
		arrayToSetDeprecation(this.chunks, "Compilation.chunks");
		/** @type {ChunkGroup[]} */
		this.chunkGroups = [];
		/** @type {Map<string, ChunkGroup>} */
		this.namedChunkGroups = new Map();
		/** @type {Map<string, Chunk>} */
		this.namedChunks = new Map();
		/** @type {Set<Module>} */
		this.modules = new Set();
		arrayToSetDeprecation(this.modules, "Compilation.modules");
		/** @private @type {Map<string, Module>} */
		this._modules = new Map();
		this.records = null;
		/** @type {string[]} */
		this.additionalChunkAssets = [];
		/** @type {CompilationAssets} */
		this.assets = {};
		/** @type {WebpackError[]} */
		this.errors = [];
		/** @type {WebpackError[]} */
		this.warnings = [];
		/** @type {Compilation[]} */
		this.children = [];
		/** @type {Map<DepConstructor, ModuleFactory>} */
		this.dependencyFactories = new Map();
		/** @type {DependencyTemplates} */
		this.dependencyTemplates = new DependencyTemplates();
		this.childrenCounters = {};
		/** @type {Set<number|string>} */
		this.usedChunkIds = null;
		/** @type {Set<number>} */
		this.usedModuleIds = null;
		/** @type {Set<string>=} */
		this.compilationDependencies = undefined;
		/** @type {boolean} */
		this.needAdditionalPass = false;
		/** @type {WeakSet<Module>} */
		this.builtModules = new WeakSet();
		/** @private @type {Map<Module, Callback[]>} */
		this._rebuildingModules = new Map();
		/** @type {WeakSet<Source>} */
		this.emittedAssets = new WeakSet();
	}

	getStats() {
		return new Stats(this);
	}

	/**
	 * @typedef {Object} AddModuleResult
	 * @property {Module} module the added or existing module
	 * @property {boolean} issuer was this the first request for this module
	 */

	/**
	 * @param {Module} module module to be added that was created
	 * @param {ModuleCallback} callback returns the module in the compilation,
	 * it could be the passed one (if new), or an already existing in the compilation
	 * @returns {void}
	 */
	addModule(module, callback) {
		this.addModuleQueue.add(module, callback);
	}

	/**
	 * @param {Module} module module to be added that was created
	 * @param {ModuleCallback} callback returns the module in the compilation,
	 * it could be the passed one (if new), or an already existing in the compilation
	 * @returns {void}
	 */
	_addModule(module, callback) {
		const identifier = module.identifier();
		const alreadyAddedModule = this._modules.get(identifier);
		if (alreadyAddedModule) {
			return callback(null, alreadyAddedModule);
		}

		const currentProfile = this.profile
			? this.moduleGraph.getProfile(module)
			: undefined;
		if (currentProfile !== undefined) {
			currentProfile.markRestoringStart();
		}

		const cacheName = `${this.compilerPath}/module/${identifier}`;
		this.cache.get(cacheName, null, (err, cacheModule) => {
			if (err) return callback(new ModuleRestoreError(module, err));

			if (currentProfile !== undefined) {
				currentProfile.markRestoringEnd();
				currentProfile.markIntegrationStart();
			}

			if (cacheModule) {
				cacheModule.updateCacheModule(module);

				module = cacheModule;
			}
			this._modules.set(identifier, module);
			this.modules.add(module);
			ModuleGraph.setModuleGraphForModule(module, this.moduleGraph);
			if (currentProfile !== undefined) {
				currentProfile.markIntegrationEnd();
			}
			callback(null, module);
		});
	}

	/**
	 * Fetches a module from a compilation by its identifier
	 * @param {Module} module the module provided
	 * @returns {Module} the module requested
	 */
	getModule(module) {
		const identifier = module.identifier();
		return this._modules.get(identifier);
	}

	/**
	 * Attempts to search for a module by its identifier
	 * @param {string} identifier identifier (usually path) for module
	 * @returns {Module|undefined} attempt to search for module and return it, else undefined
	 */
	findModule(identifier) {
		return this._modules.get(identifier);
	}

	/**
	 * Schedules a build of the module object
	 *
	 * @param {Module} module module to be built
	 * @param {ModuleCallback} callback the callback
	 * @returns {void}
	 */
	buildModule(module, callback) {
		this.buildQueue.add(module, callback);
	}

	/**
	 * Builds the module object
	 *
	 * @param {Module} module module to be built
	 * @param {ModuleCallback} callback the callback
	 * @returns {TODO} returns the callback function with results
	 */
	_buildModule(module, callback) {
		const currentProfile = this.profile
			? this.moduleGraph.getProfile(module)
			: undefined;
		if (currentProfile !== undefined) {
			currentProfile.markBuildingStart();
		}

		module.needBuild(
			{
				fileSystemInfo: this.fileSystemInfo
			},
			(err, needBuild) => {
				if (err) return callback(err);

				if (!needBuild) {
					if (currentProfile !== undefined) {
						currentProfile.markBuildingEnd();
					}
					return callback();
				}

				this.hooks.buildModule.call(module);
				this.builtModules.add(module);
				module.build(
					this.options,
					this,
					this.resolverFactory.get("normal", module.resolveOptions),
					this.inputFileSystem,
					err => {
						if (currentProfile !== undefined) {
							currentProfile.markBuildingEnd();
						}
						if (err) {
							this.hooks.failedModule.call(module, err);
							return callback(err);
						}
						if (currentProfile !== undefined) {
							currentProfile.markStoringStart();
						}
						this.cache.store(
							`${this.compilerPath}/module/${module.identifier()}`,
							null,
							module,
							err => {
								if (currentProfile !== undefined) {
									currentProfile.markStoringEnd();
								}
								if (err) {
									this.hooks.failedModule.call(module, err);
									return callback(err);
								}
								this.hooks.succeedModule.call(module);
								return callback();
							}
						);
					}
				);
			}
		);
	}

	/**
	 * @param {Module} module to be processed for deps
	 * @param {ModuleCallback} callback callback to be triggered
	 * @returns {void}
	 */
	processModuleDependencies(module, callback) {
		this.processDependenciesQueue.add(module, callback);
	}

	/**
	 * @param {Module} module to be processed for deps
	 * @param {ModuleCallback} callback callback to be triggered
	 * @returns {void}
	 */
	_processModuleDependencies(module, callback) {
		const dependencies = new Map();

		let currentBlock = module;

		const processDependency = dep => {
			this.moduleGraph.setParents(dep, currentBlock, module);
			const resourceIdent = dep.getResourceIdentifier();
			if (resourceIdent) {
				const factory = this.dependencyFactories.get(dep.constructor);
				if (factory === undefined) {
					throw new Error(
						`No module factory available for dependency type: ${
							dep.constructor.name
						}`
					);
				}
				let innerMap = dependencies.get(factory);
				if (innerMap === undefined) {
					dependencies.set(factory, (innerMap = new Map()));
				}
				let list = innerMap.get(resourceIdent);
				if (list === undefined) innerMap.set(resourceIdent, (list = []));
				list.push(dep);
			}
		};

		const processDependenciesBlock = block => {
			if (block.dependencies) {
				currentBlock = block;
				iterationOfArrayCallback(block.dependencies, processDependency);
			}
			if (block.blocks) {
				iterationOfArrayCallback(block.blocks, processDependenciesBlock);
			}
		};

		try {
			processDependenciesBlock(module);
		} catch (e) {
			return callback(e);
		}

		const sortedDependencies = [];

		for (const pair1 of dependencies) {
			for (const pair2 of pair1[1]) {
				sortedDependencies.push({
					factory: pair1[0],
					dependencies: pair2[1]
				});
			}
		}

		// This is nested so we need to allow one additional task
		this.processDependenciesQueue.increaseParallelism();

		asyncLib.forEach(
			sortedDependencies,
			(item, callback) => {
				this.handleModuleCreation(
					{
						factory: item.factory,
						dependencies: item.dependencies,
						originModule: module
					},
					err => {
						// In V8, the Error objects keep a reference to the functions on the stack. These warnings &
						// errors are created inside closures that keep a reference to the Compilation, so errors are
						// leaking the Compilation object.
						if (err && this.bail) {
							// eslint-disable-next-line no-self-assign
							err.stack = err.stack;
							return callback(err);
						}
						callback();
					}
				);
			},
			err => {
				this.processDependenciesQueue.decreaseParallelism();

				return callback(err);
			}
		);
	}

	/**
	 * @typedef {Object} HandleModuleCreationOptions
	 * @property {ModuleFactory} factory
	 * @property {Dependency[]} dependencies
	 * @property {Module | null} originModule
	 * @property {string=} context
	 */

	/**
	 * @param {HandleModuleCreationOptions} options options object
	 * @param {ModuleCallback} callback callback
	 * @returns {void}
	 */
	handleModuleCreation(
		{ factory, dependencies, originModule, context },
		callback
	) {
		const moduleGraph = this.moduleGraph;

		const currentProfile = this.profile ? new ModuleProfile() : undefined;

		this.factorizeModule(
			{ currentProfile, factory, dependencies, originModule, context },
			(err, newModule) => {
				if (err) {
					if (dependencies.every(d => d.optional)) {
						this.warnings.push(err);
					} else {
						this.errors.push(err);
					}
					return callback(err);
				}

				if (!newModule) {
					return callback();
				}

				if (currentProfile !== undefined) {
					moduleGraph.setProfile(newModule, currentProfile);
				}

				this.addModule(newModule, (err, module) => {
					if (err) {
						if (!err.module) {
							err.module = module;
						}
						this.errors.push(err);

						return callback(err);
					}

					for (let i = 0; i < dependencies.length; i++) {
						const dependency = dependencies[i];
						moduleGraph.setResolvedModule(originModule, dependency, module);
					}

					if (moduleGraph.getIssuer(module) === undefined) {
						moduleGraph.setIssuer(
							module,
							originModule !== undefined ? originModule : null
						);
					}
					if (module !== newModule) {
						if (currentProfile !== undefined) {
							const otherProfile = moduleGraph.getProfile(module);
							if (otherProfile !== undefined) {
								currentProfile.mergeInto(otherProfile);
							} else {
								moduleGraph.setProfile(module, currentProfile);
							}
						}
					}

					this.buildModule(module, err => {
						if (err) {
							if (!err.module) {
								err.module = module;
							}
							this.errors.push(err);

							return callback(err);
						}

						// This avoids deadlocks for circular dependencies
						if (this.processDependenciesQueue.isProcessing(module)) {
							return callback();
						}

						this.processModuleDependencies(module, err => {
							if (err) {
								return callback(err);
							}
							callback(null, module);
						});
					});
				});
			}
		);
	}

	/**
	 * @typedef {Object} FactorizeModuleOptions
	 * @property {ModuleProfile} currentProfile
	 * @property {ModuleFactory} factory
	 * @property {Dependency[]} dependencies
	 * @property {Module | null} originModule
	 * @property {string=} context
	 */

	/**
	 * @param {FactorizeModuleOptions} options options object
	 * @param {ModuleCallback} callback callback
	 * @returns {void}
	 */
	factorizeModule(options, callback) {
		this.factorizeQueue.add(options, callback);
	}

	/**
	 * @param {FactorizeModuleOptions} options options object
	 * @param {ModuleCallback} callback callback
	 * @returns {void}
	 */
	_factorizeModule(
		{ currentProfile, factory, dependencies, originModule, context },
		callback
	) {
		if (currentProfile !== undefined) {
			currentProfile.markFactoryStart();
		}
		factory.create(
			{
				contextInfo: {
					issuer: originModule ? originModule.nameForCondition() : "",
					compiler: this.compiler.name
				},
				resolveOptions: originModule ? originModule.resolveOptions : undefined,
				context: context
					? context
					: originModule
						? originModule.context
						: this.compiler.context,
				dependencies: dependencies
			},
			(err, newModule) => {
				if (err) {
					const notFoundError = new ModuleNotFoundError(
						originModule,
						err,
						dependencies.map(d => d.loc).filter(Boolean)[0]
					);
					return callback(notFoundError);
				}
				if (!newModule) {
					return callback();
				}
				if (currentProfile !== undefined) {
					currentProfile.markFactoryEnd();
				}

				callback(null, newModule);
			}
		);
	}

	/**
	 *
	 * @param {string} context context string path
	 * @param {Dependency} dependency dependency used to create Module chain
	 * @param {ModuleCallback} callback callback for when module chain is complete
	 * @returns {void} will throw if dependency instance is not a valid Dependency
	 */
	addModuleChain(context, dependency, callback) {
		if (
			typeof dependency !== "object" ||
			dependency === null ||
			!dependency.constructor
		) {
			throw new Error("Parameter 'dependency' must be a Dependency");
		}
		const Dep = /** @type {DepConstructor} */ (dependency.constructor);
		const moduleFactory = this.dependencyFactories.get(Dep);
		if (!moduleFactory) {
			throw new Error(
				`No dependency factory available for this dependency type: ${
					dependency.constructor.name
				}`
			);
		}

		this.handleModuleCreation(
			{
				factory: moduleFactory,
				dependencies: [dependency],
				originModule: null,
				context
			},
			err => {
				if (this.bail) {
					this.buildQueue.stop();
					this.rebuildQueue.stop();
					this.processDependenciesQueue.stop();
					this.factorizeQueue.stop();
					return callback(err);
				}
				return callback();
			}
		);
	}

	/**
	 *
	 * @param {string} context context path for entry
	 * @param {EntryDependency} entry entry dependency being created
	 * @param {string} name name of entry
	 * @param {ModuleCallback} callback callback function
	 * @returns {void} returns
	 */
	addEntry(context, entry, name, callback) {
		this.hooks.addEntry.call(entry, name);

		let entriesArray = this.entryDependencies.get(name);
		if (entriesArray === undefined) {
			entriesArray = [];
			this.entryDependencies.set(name, entriesArray);
		}
		entriesArray.push(entry);

		this.addModuleChain(context, entry, (err, module) => {
			if (err) {
				this.hooks.failedEntry.call(entry, name, err);
				return callback(err);
			}
			this.hooks.succeedEntry.call(entry, name, module);
			return callback(null, module);
		});
	}

	/**
	 * @param {Module} module module to be rebuilt
	 * @param {ModuleCallback} callback callback when module finishes rebuilding
	 * @returns {void}
	 */
	rebuildModule(module, callback) {
		this.rebuildQueue.add(module, callback);
	}

	/**
	 * @param {Module} module module to be rebuilt
	 * @param {ModuleCallback} callback callback when module finishes rebuilding
	 * @returns {void}
	 */
	_rebuildModule(module, callback) {
		this.hooks.rebuildModule.call(module);
		const oldDependencies = module.dependencies.slice();
		const oldBlocks = module.blocks.slice();
		module.invalidateBuild();
		this.buildQueue.invalidate(module);
		this.buildModule(module, err => {
			if (err) {
				this.hooks.finishRebuildingModule.call(module);
				return callback(err);
			}

			this.processModuleDependencies(module, err => {
				if (err) return callback(err);
				this.removeReasonsOfDependencyBlock(module, {
					dependencies: oldDependencies,
					blocks: oldBlocks
				});
				this.hooks.finishRebuildingModule.call(module);
				callback();
			});
		});
	}

	finish() {
		const modules = this.modules;
		this.hooks.finishModules.call(modules);

		// extract warnings and errors from modules
		for (const module of modules) {
			this.reportDependencyErrorsAndWarnings(module, [module]);
			if (module.isOptional(this.moduleGraph)) {
				for (const error of module.errors) {
					if (!error.module) {
						error.module = module;
					}
					this.warnings.push(error);
				}
			} else {
				for (const error of module.errors) {
					if (!error.module) {
						error.module = module;
					}
					this.errors.push(error);
				}
			}
			for (const warning of module.warnings) {
				if (!warning.module) {
					warning.module = module;
				}
				this.warnings.push(warning);
			}
		}
	}

	unseal() {
		this.hooks.unseal.call();
		this.chunks.clear();
		this.chunkGroups.length = 0;
		this.namedChunks.clear();
		this.namedChunkGroups.clear();
		this.entrypoints.clear();
		this.additionalChunkAssets.length = 0;
		this.assets = {};
		this.moduleGraph.removeAllModuleAttributes();
	}

	/**
	 * @param {Callback} callback signals when the seal method is finishes
	 * @returns {void}
	 */
	seal(callback) {
		const chunkGraph = new ChunkGraph(this.moduleGraph);
		this.chunkGraph = chunkGraph;

		for (const module of this.modules) {
			ChunkGraph.setChunkGraphForModule(module, chunkGraph);
		}

		this.hooks.seal.call();

		while (this.hooks.optimizeDependencies.call(this.modules)) {
			/* empty */
		}
		this.hooks.afterOptimizeDependencies.call(this.modules);

		this.hooks.beforeChunks.call();
		for (const [name, dependencies] of this.entryDependencies) {
			const chunk = this.addChunk(name);
			chunk.name = name;
			const entrypoint = new Entrypoint(name);
			entrypoint.setRuntimeChunk(chunk);
			this.namedChunkGroups.set(name, entrypoint);
			this.entrypoints.set(name, entrypoint);
			this.chunkGroups.push(entrypoint);
			connectChunkGroupAndChunk(entrypoint, chunk);

			for (const dep of dependencies) {
				entrypoint.addOrigin(null, { name }, dep.request);

				const module = this.moduleGraph.getModule(dep);
				if (module) {
					chunkGraph.connectChunkAndModule(chunk, module);
					chunkGraph.connectChunkAndEntryModule(chunk, module, entrypoint);
					this.assignDepth(module);
				}
			}
		}
		const entryChunkGroups = /** @type {Entrypoint[]} */ (this.chunkGroups.slice());
		this.processDependenciesBlocksForChunkGroups(entryChunkGroups);
		this.hooks.afterChunks.call(this.chunks);

		this.hooks.optimize.call();

		while (this.hooks.optimizeModules.call(this.modules)) {
			/* empty */
		}
		this.hooks.afterOptimizeModules.call(this.modules);

		while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {
			/* empty */
		}
		this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);

		this.hooks.optimizeTree.callAsync(this.chunks, this.modules, err => {
			if (err) {
				return callback(err);
			}

			this.hooks.afterOptimizeTree.call(this.chunks, this.modules);

			while (this.hooks.optimizeChunkModules.call(this.chunks, this.modules)) {
				/* empty */
			}
			this.hooks.afterOptimizeChunkModules.call(this.chunks, this.modules);

			const shouldRecord = this.hooks.shouldRecord.call() !== false;

			this.hooks.reviveModules.call(this.modules, this.records);
			this.hooks.beforeModuleIds.call(this.modules);
			this.hooks.moduleIds.call(this.modules);
			this.hooks.optimizeModuleIds.call(this.modules);
			this.hooks.afterOptimizeModuleIds.call(this.modules);

			this.hooks.reviveChunks.call(this.chunks, this.records);
			this.hooks.beforeChunkIds.call(this.chunks);
			this.hooks.chunkIds.call(this.chunks);
			this.hooks.optimizeChunkIds.call(this.chunks);
			this.hooks.afterOptimizeChunkIds.call(this.chunks);

			this.sortItemsWithChunkIds();

			if (shouldRecord) {
				this.hooks.recordModules.call(this.modules, this.records);
				this.hooks.recordChunks.call(this.chunks, this.records);
			}

			this.hooks.beforeModuleHash.call();
			this.createModuleHashes();
			this.hooks.afterModuleHash.call();

			this.hooks.beforeRuntimeRequirements.call();
			this.processRuntimeRequirements(entryChunkGroups);
			this.hooks.afterRuntimeRequirements.call();

			this.hooks.beforeHash.call();
			this.createHash();
			this.hooks.afterHash.call();

			if (shouldRecord) {
				this.hooks.recordHash.call(this.records);
			}

			this.hooks.beforeModuleAssets.call();
			this.createModuleAssets();

			const cont = () => {
				this.hooks.additionalChunkAssets.call(this.chunks);
				this.summarizeDependencies();
				if (shouldRecord) {
					this.hooks.record.call(this, this.records);
				}

				this.hooks.additionalAssets.callAsync(err => {
					if (err) {
						return callback(err);
					}
					this.hooks.optimizeChunkAssets.callAsync(this.chunks, err => {
						if (err) {
							return callback(err);
						}
						this.hooks.afterOptimizeChunkAssets.call(this.chunks);
						this.hooks.optimizeAssets.callAsync(this.assets, err => {
							if (err) {
								return callback(err);
							}
							this.hooks.afterOptimizeAssets.call(this.assets);
							if (this.hooks.needAdditionalSeal.call()) {
								this.unseal();
								return this.seal(callback);
							}
							return this.hooks.afterSeal.callAsync(callback);
						});
					});
				});
			};

			if (this.hooks.shouldGenerateChunkAssets.call() !== false) {
				this.hooks.beforeChunkAssets.call();
				this.createChunkAssets(err => {
					if (err) {
						return callback(err);
					}
					cont();
				});
			} else {
				cont();
			}
		});
	}

	/**
	 * @param {Module} module moulde to report from
	 * @param {DependenciesBlock[]} blocks blocks to report from
	 * @returns {void}
	 */
	reportDependencyErrorsAndWarnings(module, blocks) {
		for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
			const block = blocks[indexBlock];
			const dependencies = block.dependencies;

			for (let indexDep = 0; indexDep < dependencies.length; indexDep++) {
				const d = dependencies[indexDep];

				const warnings = d.getWarnings(this.moduleGraph);
				if (warnings) {
					for (let indexWar = 0; indexWar < warnings.length; indexWar++) {
						const w = warnings[indexWar];

						const warning = new ModuleDependencyWarning(module, w, d.loc);
						this.warnings.push(warning);
					}
				}
				const errors = d.getErrors(this.moduleGraph);
				if (errors) {
					for (let indexErr = 0; indexErr < errors.length; indexErr++) {
						const e = errors[indexErr];

						const error = new ModuleDependencyError(module, e, d.loc);
						this.errors.push(error);
					}
				}
			}

			this.reportDependencyErrorsAndWarnings(module, block.blocks);
		}
	}

	/**
	 * @param {Entrypoint[]} entrypoints the entrypoints
	 * @returns {void}
	 */
	processRuntimeRequirements(entrypoints) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeTemplate,
			dependencyTemplates
		} = this;

		/** @type {Map<Module, Iterable<string>>} */
		const moduleRequirements = new Map();

		for (const module of this.modules) {
			if (chunkGraph.getNumberOfModuleChunks(module) > 0) {
				const runtimeRequirements = module.getRuntimeRequirements({
					dependencyTemplates,
					runtimeTemplate,
					moduleGraph,
					chunkGraph
				});
				if (runtimeRequirements) {
					moduleRequirements.set(module, runtimeRequirements);
				}
			}
		}

		/** @type {Map<Chunk, Set<string>>} */
		const chunkRequirements = new Map();

		for (const chunk of this.chunks) {
			const set = new Set();
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				const runtimeRequirements = moduleRequirements.get(module);
				if (runtimeRequirements !== undefined) {
					for (const r of runtimeRequirements) set.add(r);
				}
			}
			this.hooks.additionalChunkRuntimeRequirements.call(chunk, set);

			for (const r of set) {
				this.hooks.runtimeRequirementInChunk.for(r).call(chunk, set);
			}

			chunkRequirements.set(chunk, set);
		}

		for (const entrypoint of entrypoints) {
			const chunk = entrypoint.getRuntimeChunk();
			const allReferencedChunks = new Set();
			const queue = new Set(chunk.groupsIterable);
			for (const chunkGroup of queue) {
				for (const chunk of chunkGroup.chunks) {
					allReferencedChunks.add(chunk);
				}
				for (const child of chunkGroup.childrenIterable) {
					queue.add(child);
				}
			}

			const set = new Set();
			for (const chunk of allReferencedChunks) {
				const runtimeRequirements = chunkRequirements.get(chunk);
				for (const r of runtimeRequirements) set.add(r);
			}

			this.hooks.additionalTreeRuntimeRequirements.call(chunk, set);

			for (const r of set) {
				this.hooks.runtimeRequirementInTree.for(r).call(chunk, set);
			}
		}
	}

	/**
	 * @param {Chunk} chunk target chunk
	 * @param {RuntimeModule} module runtime module
	 * @returns {void}
	 */
	addRuntimeModule(chunk, module) {
		// Deprecated ModuleGraph association
		ModuleGraph.setModuleGraphForModule(module, this.moduleGraph);

		// add it to the list
		this.modules.add(module);

		// connect to the chunk graph
		this.chunkGraph.connectChunkAndModule(chunk, module);
		this.chunkGraph.connectChunkAndRuntimeModule(chunk, module);

		// Setup internals
		this.moduleGraph.setUsedExports(module, new SortableSet());

		// Call hook
		this.hooks.runtimeModule.call(module, chunk);

		// Determine hash of the module
		const { chunkGraph } = this;
		const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;

		const moduleHash = createHash(hashFunction);
		module.updateHash(moduleHash, chunkGraph);
		const moduleHashDigest = moduleHash.digest(hashDigest);
		chunkGraph.setModuleHashes(
			module,
			moduleHashDigest,
			moduleHashDigest.substr(0, hashDigestLength)
		);
	}

	/**
	 * @param {TODO} groupOptions options for the chunk group
	 * @param {Module} module the module the references the chunk group
	 * @param {DependencyLocation} loc the location from with the chunk group is referenced (inside of module)
	 * @param {string} request the request from which the the chunk group is referenced
	 * @returns {ChunkGroup} the new or existing chunk group
	 */
	addChunkInGroup(groupOptions, module, loc, request) {
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions };
		}
		const name = groupOptions.name;
		if (name) {
			const chunkGroup = this.namedChunkGroups.get(name);
			if (chunkGroup !== undefined) {
				chunkGroup.addOptions(groupOptions);
				if (module) {
					chunkGroup.addOrigin(module, loc, request);
				}
				return chunkGroup;
			}
		}
		const chunkGroup = new ChunkGroup(groupOptions);
		if (module) chunkGroup.addOrigin(module, loc, request);
		const chunk = this.addChunk(name);

		connectChunkGroupAndChunk(chunkGroup, chunk);

		this.chunkGroups.push(chunkGroup);
		if (name) {
			this.namedChunkGroups.set(name, chunkGroup);
		}
		return chunkGroup;
	}

	/**
	 * This method first looks to see if a name is provided for a new chunk,
	 * and first looks to see if any named chunks already exist and reuse that chunk instead.
	 *
	 * @param {string=} name optional chunk name to be provided
	 * @returns {Chunk} create a chunk (invoked during seal event)
	 */
	addChunk(name) {
		if (name) {
			const chunk = this.namedChunks.get(name);
			if (chunk !== undefined) {
				return chunk;
			}
		}
		const chunk = new Chunk(name);
		this.chunks.add(chunk);
		ChunkGraph.setChunkGraphForChunk(chunk, this.chunkGraph);
		if (name) {
			this.namedChunks.set(name, chunk);
		}
		return chunk;
	}

	/**
	 * @param {Module} module module to assign depth
	 * @returns {void}
	 */
	assignDepth(module) {
		const moduleGraph = this.moduleGraph;

		const queue = new Set([module]);
		let depth;

		moduleGraph.setDepth(module, 0);

		/**
		 * @param {Module} module module for processeing
		 * @returns {void}
		 */
		const enqueueJob = module => {
			if (!moduleGraph.setDepthIfLower(module, depth)) return;
			queue.add(module);
		};

		/**
		 * @param {Dependency} dependency dependency to assign depth to
		 * @returns {void}
		 */
		const assignDepthToDependency = dependency => {
			const module = this.moduleGraph.getModule(dependency);
			if (module) {
				enqueueJob(module);
			}
		};

		/**
		 * @param {DependenciesBlock} block block to assign depth to
		 * @returns {void}
		 */
		const assignDepthToDependencyBlock = block => {
			if (block.dependencies) {
				iterationOfArrayCallback(block.dependencies, assignDepthToDependency);
			}

			if (block.blocks) {
				iterationOfArrayCallback(block.blocks, assignDepthToDependencyBlock);
			}
		};

		for (module of queue) {
			queue.delete(module);
			depth = moduleGraph.getDepth(module) + 1;

			assignDepthToDependencyBlock(module);
		}
	}

	/**
	 * @param {Module} module the module containing the dependency
	 * @param {Dependency} dependency the dependency
	 * @returns {DependencyReference} a reference for the dependency
	 */
	getDependencyReference(module, dependency) {
		const ref = dependency.getReference(this.moduleGraph);
		if (!ref) return null;
		return this.hooks.dependencyReference.call(ref, dependency, module);
	}

	/**
	 * This method creates the Chunk graph from the Module graph
	 * @private
	 * @param {Entrypoint[]} inputChunkGroups chunk groups which are processed
	 * @returns {void}
	 */
	processDependenciesBlocksForChunkGroups(inputChunkGroups) {
		// Process is splitting into two parts:
		// Part one traverse the module graph and builds a very basic chunks graph
		//   in chunkDependencies.
		// Part two traverse every possible way through the basic chunk graph and
		//   tracks the available modules. While traversing it connects chunks with
		//   eachother and Blocks with Chunks. It stops traversing when all modules
		//   for a chunk are already available. So it doesn't connect unneeded chunks.

		const moduleGraph = this.moduleGraph;

		/** @typedef {{block: AsyncDependenciesBlock, chunkGroup: ChunkGroup, couldBeFiltered: boolean}} ChunkGroupDep */

		/** @type {Map<ChunkGroup, ChunkGroupDep[]>} */
		const chunkDependencies = new Map();
		/** @type {Set<ChunkGroup>} */
		const allCreatedChunkGroups = new Set();

		// PREPARE
		/** @type {Map<DependenciesBlock, { modules: Module[], blocks: AsyncDependenciesBlock[]}>} */
		const blockInfoMap = new Map();

		/**
		 * @param {Dependency} d dependency to iterate over
		 * @returns {void}
		 */
		const iteratorDependency = d => {
			// We skip Dependencies without Reference
			const ref = this.getDependencyReference(currentModule, d);
			if (!ref) {
				return;
			}
			// We skip Dependencies without Module pointer
			const refModule = ref.module;
			if (!refModule) {
				return;
			}
			// We skip weak Dependencies
			if (ref.weak) {
				return;
			}

			blockInfoModules.add(refModule);
		};

		/**
		 * @param {AsyncDependenciesBlock} b blocks to prepare
		 * @returns {void}
		 */
		const iteratorBlockPrepare = b => {
			blockInfoBlocks.push(b);
			blockQueue.push(b);
		};

		/** @type {Module} */
		let currentModule;
		/** @type {DependenciesBlock} */
		let block;
		/** @type {DependenciesBlock[]} */
		let blockQueue;
		/** @type {Set<Module>} */
		let blockInfoModules;
		/** @type {AsyncDependenciesBlock[]} */
		let blockInfoBlocks;

		for (const module of this.modules) {
			blockQueue = [module];
			currentModule = module;
			while (blockQueue.length > 0) {
				block = blockQueue.pop();
				blockInfoModules = new Set();
				blockInfoBlocks = [];

				if (block.dependencies) {
					iterationOfArrayCallback(block.dependencies, iteratorDependency);
				}

				if (block.blocks) {
					iterationOfArrayCallback(block.blocks, iteratorBlockPrepare);
				}

				const blockInfo = {
					modules: Array.from(blockInfoModules),
					blocks: blockInfoBlocks
				};
				blockInfoMap.set(block, blockInfo);
			}
		}

		const chunkGraph = this.chunkGraph;

		// PART ONE

		/** @type {Map<ChunkGroup, { preOrderIndex: number, postOrderIndex: number }>} */
		const chunkGroupCounters = new Map();
		for (const chunkGroup of inputChunkGroups) {
			chunkGroupCounters.set(chunkGroup, {
				preOrderIndex: 0,
				postOrderIndex: 0
			});
		}

		let nextFreeModulePreOrderIndex = 0;
		let nextFreeModulePostOrderIndex = 0;

		/** @type {Map<DependenciesBlock, ChunkGroup>} */
		const blockChunkGroups = new Map();

		/** @type {Set<DependenciesBlock>} */
		const blocksWithNestedBlocks = new Set();

		const ADD_AND_ENTER_MODULE = 0;
		const ENTER_MODULE = 1;
		const PROCESS_BLOCK = 2;
		const LEAVE_MODULE = 3;

		/**
		 * @typedef {Object} QueueItem
		 * @property {number} action
		 * @property {DependenciesBlock} block
		 * @property {Module} module
		 * @property {Chunk} chunk
		 * @property {ChunkGroup} chunkGroup
		 */

		/**
		 * @param {QueueItem[]} queue the queue array (will be mutated)
		 * @param {ChunkGroup} chunkGroup chunk group
		 * @returns {QueueItem[]} the queue array again
		 */
		const reduceChunkGroupToQueueItem = (queue, chunkGroup) => {
			for (const chunk of chunkGroup.chunks) {
				for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
					queue.push({
						action: ENTER_MODULE,
						block: module,
						module,
						chunk,
						chunkGroup
					});
				}
			}
			return queue;
		};

		// Start with the provided modules/chunks
		/** @type {QueueItem[]} */
		let queue = inputChunkGroups
			.reduce(reduceChunkGroupToQueueItem, [])
			.reverse();
		/** @type {QueueItem[]} */
		let queueDelayed = [];

		/** @type {Module} */
		let module;
		/** @type {Chunk} */
		let chunk;
		/** @type {ChunkGroup} */
		let chunkGroup;

		// For each async Block in graph
		/**
		 * @param {AsyncDependenciesBlock} b iterating over each Async DepBlock
		 * @returns {void}
		 */
		const iteratorBlock = b => {
			// 1. We create a chunk for this Block
			// but only once (blockChunkGroups map)
			let c = blockChunkGroups.get(b);
			if (c === undefined) {
				c = this.namedChunkGroups.get(b.chunkName);
				if (c && c.isInitial()) {
					this.errors.push(
						new AsyncDependencyToInitialChunkError(b.chunkName, module, b.loc)
					);
					c = chunkGroup;
				} else {
					c = this.addChunkInGroup(
						b.groupOptions || b.chunkName,
						module,
						b.loc,
						b.request
					);
					chunkGroupCounters.set(c, { preOrderIndex: 0, postOrderIndex: 0 });
					blockChunkGroups.set(b, c);
					allCreatedChunkGroups.add(c);
				}
			} else {
				c.addOptions(b.groupOptions);
				c.addOrigin(module, b.loc, b.request);
			}

			// 2. We store the Block+Chunk mapping as dependency for the chunk
			let deps = chunkDependencies.get(chunkGroup);
			if (!deps) chunkDependencies.set(chunkGroup, (deps = []));
			deps.push({
				block: b,
				chunkGroup: c,
				couldBeFiltered: true
			});

			// 3. We enqueue the DependenciesBlock for traversal
			queueDelayed.push({
				action: PROCESS_BLOCK,
				block: b,
				module: module,
				chunk: c.chunks[0],
				chunkGroup: c
			});
		};

		// Iterative traversal of the Module graph
		// Recursive would be simpler to write but could result in Stack Overflows
		while (queue.length) {
			while (queue.length) {
				const queueItem = queue.pop();
				module = queueItem.module;
				block = queueItem.block;
				chunk = queueItem.chunk;
				chunkGroup = queueItem.chunkGroup;

				switch (queueItem.action) {
					case ADD_AND_ENTER_MODULE: {
						// We connect Module and Chunk when not already done
						if (!chunkGraph.connectChunkAndModule(chunk, module)) {
							// already connected, skip it
							break;
						}
					}
					// fallthrough
					case ENTER_MODULE: {
						if (chunkGroup !== undefined) {
							const index = chunkGroup.getModulePreOrderIndex(module);
							if (index === undefined) {
								chunkGroup.setModulePreOrderIndex(
									module,
									chunkGroupCounters.get(chunkGroup).preOrderIndex++
								);
							}
						}

						if (
							moduleGraph.setPreOrderIndexIfUnset(
								module,
								nextFreeModulePreOrderIndex
							)
						) {
							nextFreeModulePreOrderIndex++;
						}

						queue.push({
							action: LEAVE_MODULE,
							block,
							module,
							chunk,
							chunkGroup
						});
					}
					// fallthrough
					case PROCESS_BLOCK: {
						// get prepared block info
						const blockInfo = blockInfoMap.get(block);

						// Traverse all referenced modules
						for (let i = blockInfo.modules.length - 1; i >= 0; i--) {
							const refModule = blockInfo.modules[i];
							if (chunkGraph.isModuleInChunk(refModule, chunk)) {
								// skip early if already connected
								continue;
							}
							// enqueue the add and enter to enter in the correct order
							// this is relevant with circular dependencies
							queue.push({
								action: ADD_AND_ENTER_MODULE,
								block: refModule,
								module: refModule,
								chunk,
								chunkGroup
							});
						}

						// Traverse all Blocks
						iterationOfArrayCallback(blockInfo.blocks, iteratorBlock);

						if (blockInfo.blocks.length > 0 && module !== block) {
							blocksWithNestedBlocks.add(block);
						}
						break;
					}
					case LEAVE_MODULE: {
						if (chunkGroup !== undefined) {
							const index = chunkGroup.getModulePostOrderIndex(module);
							if (index === undefined) {
								chunkGroup.setModulePostOrderIndex(
									module,
									chunkGroupCounters.get(chunkGroup).postOrderIndex++
								);
							}
						}

						if (
							moduleGraph.setPostOrderIndexIfUnset(
								module,
								nextFreeModulePostOrderIndex
							)
						) {
							nextFreeModulePostOrderIndex++;
						}
						break;
					}
				}
			}
			const tempQueue = queue;
			queue = queueDelayed.reverse();
			queueDelayed = tempQueue;
		}

		// PART TWO
		/** @type {Set<Module>} */
		let newAvailableModules;

		/**
		 * @typedef {Object} ChunkGroupInfo
		 * @property {Set<Module>} minAvailableModules current minimal set of modules available at this point
		 * @property {Set<Module>[]} availableModulesToBeMerged enqueued updates to the minimal set of available modules
		 */

		/** @type {Map<ChunkGroup, ChunkGroupInfo>} */
		const chunkGroupInfoMap = new Map();

		/** @type {Queue<ChunkGroup>} */
		const queue2 = new Queue(inputChunkGroups);

		for (const chunkGroup of inputChunkGroups) {
			chunkGroupInfoMap.set(chunkGroup, {
				minAvailableModules: undefined,
				availableModulesToBeMerged: [new Set()]
			});
		}

		/**
		 * Helper function to check if all modules of a chunk are available
		 *
		 * @param {ChunkGroup} chunkGroup the chunkGroup to scan
		 * @param {Set<Module>} availableModules the comparitor set
		 * @returns {boolean} return true if all modules of a chunk are available
		 */
		const areModulesAvailable = (chunkGroup, availableModules) => {
			for (const chunk of chunkGroup.chunks) {
				for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
					if (!availableModules.has(module)) return false;
				}
			}
			return true;
		};

		// For each edge in the basic chunk graph
		/**
		 * @param {ChunkGroupDep} dep the dependency used for filtering
		 * @returns {boolean} used to filter "edges" (aka Dependencies) that were pointing
		 * to modules that are already available. Also filters circular dependencies in the chunks graph
		 */
		const filterFn = dep => {
			const depChunkGroup = dep.chunkGroup;
			if (!dep.couldBeFiltered) return true;
			if (blocksWithNestedBlocks.has(dep.block)) return true;
			if (areModulesAvailable(depChunkGroup, newAvailableModules)) {
				return false; // break all modules are already available
			}
			dep.couldBeFiltered = false;
			return true;
		};

		// Iterative traversing of the basic chunk graph
		while (queue2.length) {
			chunkGroup = queue2.dequeue();
			const info = chunkGroupInfoMap.get(chunkGroup);
			const availableModulesToBeMerged = info.availableModulesToBeMerged;
			let minAvailableModules = info.minAvailableModules;

			// 1. Get minimal available modules
			// It doesn't make sense to traverse a chunk again with more available modules.
			// This step calculates the minimal available modules and skips traversal when
			// the list didn't shrink.
			availableModulesToBeMerged.sort(bySetSize);
			let changed = false;
			for (const availableModules of availableModulesToBeMerged) {
				if (minAvailableModules === undefined) {
					minAvailableModules = new Set(availableModules);
					info.minAvailableModules = minAvailableModules;
					changed = true;
				} else {
					for (const m of minAvailableModules) {
						if (!availableModules.has(m)) {
							minAvailableModules.delete(m);
							changed = true;
						}
					}
				}
			}
			availableModulesToBeMerged.length = 0;
			if (!changed) continue;

			// 2. Get the edges at this point of the graph
			const deps = chunkDependencies.get(chunkGroup);
			if (!deps) continue;
			if (deps.length === 0) continue;

			// 3. Create a new Set of available modules at this points
			newAvailableModules = new Set(minAvailableModules);
			for (const chunk of chunkGroup.chunks) {
				for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
					newAvailableModules.add(m);
				}
			}

			// 4. Foreach remaining edge
			const nextChunkGroups = new Set();
			for (let i = 0; i < deps.length; i++) {
				const dep = deps[i];

				// Filter inline, rather than creating a new array from `.filter()`
				if (!filterFn(dep)) {
					continue;
				}
				const depChunkGroup = dep.chunkGroup;
				const depBlock = dep.block;

				// 5. Connect block with chunk
				chunkGraph.connectBlockAndChunkGroup(depBlock, depChunkGroup);

				// 6. Connect chunk with parent
				connectChunkGroupParentAndChild(chunkGroup, depChunkGroup);

				nextChunkGroups.add(depChunkGroup);
			}

			// 7. Enqueue further traversal
			for (const nextChunkGroup of nextChunkGroups) {
				let nextInfo = chunkGroupInfoMap.get(nextChunkGroup);
				if (nextInfo === undefined) {
					nextInfo = {
						minAvailableModules: undefined,
						availableModulesToBeMerged: []
					};
					chunkGroupInfoMap.set(nextChunkGroup, nextInfo);
				}
				nextInfo.availableModulesToBeMerged.push(newAvailableModules);

				// As queue deduplicates enqueued items this makes sure that a ChunkGroup
				// is not enqueued twice
				queue2.enqueue(nextChunkGroup);
			}
		}

		// Remove all unconnected chunk groups
		for (const chunkGroup of allCreatedChunkGroups) {
			if (chunkGroup.getNumberOfParents() === 0) {
				for (const chunk of chunkGroup.chunks) {
					this.chunks.delete(chunk);
					chunkGraph.disconnectChunk(chunk);
				}
				chunkGraph.disconnectChunkGroup(chunkGroup);
				chunkGroup.remove();
			}
		}
	}

	/**
	 *
	 * @param {Module} module module relationship for removal
	 * @param {DependenciesBlockLike} block //TODO: good description
	 * @returns {void}
	 */
	removeReasonsOfDependencyBlock(module, block) {
		const chunkGraph = this.chunkGraph;
		const iteratorDependency = d => {
			if (!d.module) {
				return;
			}
			if (d.module.removeReason(module, d)) {
				for (const chunk of chunkGraph.getModuleChunksIterable(d.module)) {
					this.patchChunksAfterReasonRemoval(d.module, chunk);
				}
			}
		};

		if (block.blocks) {
			iterationOfArrayCallback(block.blocks, block =>
				this.removeReasonsOfDependencyBlock(module, block)
			);
		}

		if (block.dependencies) {
			iterationOfArrayCallback(block.dependencies, iteratorDependency);
		}
	}

	/**
	 * @param {Module} module module to patch tie
	 * @param {Chunk} chunk chunk to patch tie
	 * @returns {void}
	 */
	patchChunksAfterReasonRemoval(module, chunk) {
		if (!module.hasReasons(this.moduleGraph)) {
			this.removeReasonsOfDependencyBlock(module, module);
		}
		if (!module.hasReasonForChunk(chunk, this.moduleGraph, this.chunkGraph)) {
			if (this.chunkGraph.isModuleInChunk(module, chunk)) {
				this.chunkGraph.disconnectChunkAndModule(chunk, module);
				this.removeChunkFromDependencies(module, chunk);
			}
		}
	}

	/**
	 *
	 * @param {DependenciesBlock} block block tie for Chunk
	 * @param {Chunk} chunk chunk to remove from dep
	 * @returns {void}
	 */
	removeChunkFromDependencies(block, chunk) {
		const iteratorDependency = d => {
			if (!d.module) {
				return;
			}
			this.patchChunksAfterReasonRemoval(d.module, chunk);
		};

		const blocks = block.blocks;
		for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
			const asyncBlock = blocks[indexBlock];
			const chunkGroup = this.chunkGraph.getBlockChunkGroup(asyncBlock);
			// Grab all chunks from the first Block's AsyncDepBlock
			const chunks = chunkGroup.chunks;
			// For each chunk in chunkGroup
			for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
				const iteratedChunk = chunks[indexChunk];
				chunkGroup.removeChunk(iteratedChunk);
				// Recurse
				this.removeChunkFromDependencies(block, iteratedChunk);
			}
		}

		if (block.dependencies) {
			iterationOfArrayCallback(block.dependencies, iteratorDependency);
		}
	}

	sortItemsWithChunkIds() {
		for (const chunkGroup of this.chunkGroups) {
			chunkGroup.sortItems();
		}

		const byMessage = compareSelect(
			err => `${err.message}`,
			compareStringsNumeric
		);
		const byModule = compareSelect(
			err => (err.module && err.module.identifier()) || "",
			compareStringsNumeric
		);
		const byLocation = compareSelect(err => err.loc, compareLocations);
		const compareErrors = concatComparators(byModule, byLocation, byMessage);

		this.errors.sort(compareErrors);
		this.warnings.sort(compareErrors);
		this.children.sort(byNameOrHash);
	}

	summarizeDependencies() {
		this.fileDependencies = new SortableSet(this.compilationDependencies);
		this.contextDependencies = new SortableSet();
		this.missingDependencies = new SortableSet();

		for (
			let indexChildren = 0;
			indexChildren < this.children.length;
			indexChildren++
		) {
			const child = this.children[indexChildren];

			addAllToSet(this.fileDependencies, child.fileDependencies);
			addAllToSet(this.contextDependencies, child.contextDependencies);
			addAllToSet(this.missingDependencies, child.missingDependencies);
		}

		for (const module of this.modules) {
			if (module.buildInfo.fileDependencies) {
				addAllToSet(this.fileDependencies, module.buildInfo.fileDependencies);
			}
			if (module.buildInfo.contextDependencies) {
				addAllToSet(
					this.contextDependencies,
					module.buildInfo.contextDependencies
				);
			}
		}
		for (const error of this.errors) {
			if (
				typeof error.missing === "object" &&
				error.missing &&
				error.missing[Symbol.iterator]
			) {
				addAllToSet(this.missingDependencies, error.missing);
			}
		}
		this.fileDependencies.sort();
		this.contextDependencies.sort();
		this.missingDependencies.sort();
	}

	createModuleHashes() {
		const chunkGraph = this.chunkGraph;
		const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;
		for (const module of this.modules) {
			const moduleHash = createHash(hashFunction);
			module.updateHash(moduleHash, chunkGraph);
			const moduleHashDigest = moduleHash.digest(hashDigest);
			chunkGraph.setModuleHashes(
				module,
				moduleHashDigest,
				moduleHashDigest.substr(0, hashDigestLength)
			);
		}
	}

	createHash() {
		const chunkGraph = this.chunkGraph;
		const outputOptions = this.outputOptions;
		const hashFunction = outputOptions.hashFunction;
		const hashDigest = outputOptions.hashDigest;
		const hashDigestLength = outputOptions.hashDigestLength;
		const hash = createHash(hashFunction);
		if (outputOptions.hashSalt) {
			hash.update(outputOptions.hashSalt);
		}
		this.mainTemplate.updateHash(hash);
		this.chunkTemplate.updateHash(hash);
		for (const key of Object.keys(this.moduleTemplates).sort()) {
			this.moduleTemplates[key].updateHash(hash);
		}
		for (const child of this.children) {
			hash.update(child.hash);
		}
		for (const warning of this.warnings) {
			hash.update(`${warning.message}`);
		}
		for (const error of this.errors) {
			hash.update(`${error.message}`);
		}

		// clone needed as sort below is inplace mutation
		const chunks = Array.from(this.chunks);
		/**
		 * sort here will bring all "falsy" values to the beginning
		 * this is needed as the "hasRuntime()" chunks are dependent on the
		 * hashes of the non-runtime chunks.
		 */
		chunks.sort((a, b) => {
			const aEntry = a.hasRuntime();
			const bEntry = b.hasRuntime();
			if (aEntry && !bEntry) return 1;
			if (!aEntry && bEntry) return -1;
			return byId(a, b);
		});
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const chunkHash = createHash(hashFunction);
			try {
				if (outputOptions.hashSalt) {
					chunkHash.update(outputOptions.hashSalt);
				}
				chunk.updateHash(chunkHash, chunkGraph);
				const template = chunk.hasRuntime()
					? this.mainTemplate
					: this.chunkTemplate;
				template.updateHashForChunk(chunkHash, chunk, {
					chunkGraph,
					moduleGraph: this.moduleGraph,
					runtimeTemplate: this.runtimeTemplate
				});
				this.hooks.chunkHash.call(chunk, chunkHash);
				chunk.hash = chunkHash.digest(hashDigest);
				hash.update(chunk.hash);
				chunk.renderedHash = chunk.hash.substr(0, hashDigestLength);
				this.hooks.contentHash.call(chunk);
			} catch (err) {
				this.errors.push(new ChunkRenderError(chunk, "", err));
			}
		}
		this.fullHash = hash.digest(hashDigest);
		this.hash = this.fullHash.substr(0, hashDigestLength);
	}

	/**
	 * @param {string} update extra information
	 * @returns {void}
	 */
	modifyHash(update) {
		const outputOptions = this.outputOptions;
		const hashFunction = outputOptions.hashFunction;
		const hashDigest = outputOptions.hashDigest;
		const hashDigestLength = outputOptions.hashDigestLength;
		const hash = createHash(hashFunction);
		hash.update(this.fullHash);
		hash.update(update);
		this.fullHash = hash.digest(hashDigest);
		this.hash = this.fullHash.substr(0, hashDigestLength);
	}

	createModuleAssets() {
		for (const module of this.modules) {
			if (module.buildInfo.assets) {
				for (const assetName of Object.keys(module.buildInfo.assets)) {
					const fileName = this.getPath(assetName, {
						chunkGraph: this.chunkGraph,
						module
					});
					this.assets[fileName] = module.buildInfo.assets[assetName];
					this.hooks.moduleAsset.call(module, fileName);
				}
			}
		}
	}

	createChunkAssets(callback) {
		const outputOptions = this.outputOptions;
		const cachedSourceMap = new WeakMap();
		/** @type {Map<string, {hash: string, source: Source, chunk: Chunk}>} */
		const alreadyWrittenFiles = new Map();

		asyncLib.forEach(
			this.chunks,
			(chunk, _callback) => {
				// TODO Workaround for https://github.com/suguru03/neo-async/issues/63
				const callback = err => process.nextTick(() => _callback(err));

				/** @type {RenderManifestEntry[]} */
				let manifest;
				try {
					chunk.files = [];
					const template = chunk.hasRuntime()
						? this.mainTemplate
						: this.chunkTemplate;
					manifest = template.getRenderManifest({
						chunk,
						hash: this.hash,
						fullHash: this.fullHash,
						outputOptions,
						moduleTemplates: this.moduleTemplates,
						dependencyTemplates: this.dependencyTemplates,
						chunkGraph: this.chunkGraph,
						moduleGraph: this.moduleGraph,
						runtimeTemplate: this.runtimeTemplate
					}); // [{ render(), filenameTemplate, pathOptions, identifier, hash }]
				} catch (err) {
					this.errors.push(new ChunkRenderError(chunk, "", err));
					return callback();
				}
				asyncLib.forEach(
					manifest,
					(fileManifest, _callback) => {
						// TODO Workaround for https://github.com/suguru03/neo-async/issues/63
						const callback = err => process.nextTick(() => _callback(err));

						const ident = fileManifest.identifier;
						const cacheName = `${this.compilerPath}/asset/${ident}`;
						const usedHash = fileManifest.hash;

						this.cache.get(cacheName, usedHash, (err, sourceFromCache) => {
							let filenameTemplate, file;
							try {
								filenameTemplate = fileManifest.filenameTemplate;
								file = this.getPath(filenameTemplate, fileManifest.pathOptions);
								if (err) {
									this.errors.push(
										new ChunkRenderError(chunk, file || filenameTemplate, err)
									);
									return callback();
								}

								let source = sourceFromCache;

								// check if the same filename was already written by another chunk
								const alreadyWritten = alreadyWrittenFiles.get(file);
								if (alreadyWritten !== undefined) {
									if (alreadyWritten.hash !== usedHash) {
										return callback(
											new Error(
												`Conflict: Multiple chunks emit assets to the same filename ${file}` +
													` (chunks ${alreadyWritten.chunk.id} and ${chunk.id})`
											)
										);
									} else {
										source = alreadyWritten.source;
									}
								} else if (!source) {
									// render the asset
									source = fileManifest.render();

									// Ensure that source is a cached source to avoid additional cost because of repeated access
									if (!(source instanceof CachedSource)) {
										const cacheEntry = cachedSourceMap.get(source);
										if (cacheEntry) {
											source = cacheEntry;
										} else {
											const cachedSource = new CachedSource(source);
											cachedSourceMap.set(source, cachedSource);
											source = cachedSource;
										}
									}
								}
								if (this.assets[file] && this.assets[file] !== source) {
									return callback(
										new Error(
											`Conflict: Rendering chunk ${chunk.id} ` +
												`emits to the filename ${file} ` +
												"which was already written to by something else " +
												"(but not another chunk)"
										)
									);
								}
								this.assets[file] = source;
								chunk.files.push(file);
								this.hooks.chunkAsset.call(chunk, file);
								alreadyWrittenFiles.set(file, {
									hash: usedHash,
									source,
									chunk
								});
								if (source !== sourceFromCache) {
									this.cache.store(cacheName, usedHash, source, callback);
								} else {
									callback();
								}
							} catch (err) {
								this.errors.push(
									new ChunkRenderError(chunk, file || filenameTemplate, err)
								);
								return callback();
							}
						});
					},
					callback
				);
			},
			callback
		);
	}

	/**
	 * @param {string | function(PathData): string} filename used to get asset path with hash
	 * @param {PathData} data context data
	 * @returns {string} interpolated path
	 */
	getPath(filename, data) {
		if (!data.hash) {
			data = Object.assign(
				{
					hash: this.hash
				},
				data
			);
		}
		return this.mainTemplate.getAssetPath(filename, data);
	}

	/**
	 * This function allows you to run another instance of webpack inside of webpack however as
	 * a child with different settings and configurations (if desired) applied. It copies all hooks, plugins
	 * from parent (or top level compiler) and creates a child Compilation
	 *
	 * @param {string} name name of the child compiler
	 * @param {TODO} outputOptions // Need to convert config schema to types for this
	 * @param {Plugin[]} plugins webpack plugins that will be applied
	 * @returns {Compiler} creates a child Compiler instance
	 */
	createChildCompiler(name, outputOptions, plugins) {
		const idx = this.childrenCounters[name] || 0;
		this.childrenCounters[name] = idx + 1;
		return this.compiler.createChildCompiler(
			this,
			name,
			idx,
			outputOptions,
			plugins
		);
	}

	checkConstraints() {
		const chunkGraph = this.chunkGraph;

		/** @type {Set<number|string>} */
		const usedIds = new Set();

		for (const module of this.modules) {
			const moduleId = chunkGraph.getModuleId(module);
			if (moduleId === null) continue;
			if (usedIds.has(moduleId)) {
				throw new Error(`checkConstraints: duplicate module id ${moduleId}`);
			}
			usedIds.add(moduleId);
		}

		for (const chunk of this.chunks) {
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				if (!this.modules.has(module)) {
					throw new Error(
						"checkConstraints: module in chunk but not in compilation " +
							` ${chunk.debugId} ${module.debugId}`
					);
				}
			}
			for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
				if (!this.modules.has(module)) {
					throw new Error(
						"checkConstraints: entry module in chunk but not in compilation " +
							` ${chunk.debugId} ${module.debugId}`
					);
				}
			}
		}

		for (const chunkGroup of this.chunkGroups) {
			chunkGroup.checkConstraints();
		}
	}
}

module.exports = Compilation;
