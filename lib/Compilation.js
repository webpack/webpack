/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const asyncLib = require("neo-async");
const util = require("util");
const { CachedSource } = require("webpack-sources");
const {
	Tapable,
	SyncHook,
	SyncBailHook,
	SyncWaterfallHook,
	AsyncSeriesHook
} = require("tapable");
const EntryModuleNotFoundError = require("./EntryModuleNotFoundError");
const ModuleNotFoundError = require("./ModuleNotFoundError");
const ModuleDependencyWarning = require("./ModuleDependencyWarning");
const ModuleDependencyError = require("./ModuleDependencyError");
const ChunkGroup = require("./ChunkGroup");
const Chunk = require("./Chunk");
const Entrypoint = require("./Entrypoint");
const MainTemplate = require("./MainTemplate");
const ChunkTemplate = require("./ChunkTemplate");
const HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");
const ModuleTemplate = require("./ModuleTemplate");
const RuntimeTemplate = require("./RuntimeTemplate");
const Dependency = require("./Dependency");
const ChunkRenderError = require("./ChunkRenderError");
const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const Stats = require("./Stats");
const Semaphore = require("./util/Semaphore");
const createHash = require("./util/createHash");
const Queue = require("./util/Queue");
const SortableSet = require("./util/SortableSet");
const GraphHelpers = require("./GraphHelpers");

const byId = (a, b) => {
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	return 0;
};

const byIdOrIdentifier = (a, b) => {
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	const identA = a.identifier();
	const identB = b.identifier();
	if (identA < identB) return -1;
	if (identA > identB) return 1;
	return 0;
};

const byIndexOrIdentifier = (a, b) => {
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;
	const identA = a.identifier();
	const identB = b.identifier();
	if (identA < identB) return -1;
	if (identA > identB) return 1;
	return 0;
};

const iterationBlockVariable = (variables, fn) => {
	for (
		let indexVariable = 0;
		indexVariable < variables.length;
		indexVariable++
	) {
		const varDep = variables[indexVariable].dependencies;
		for (let indexVDep = 0; indexVDep < varDep.length; indexVDep++) {
			fn(varDep[indexVDep]);
		}
	}
};

const iterationOfArrayCallback = (arr, fn) => {
	for (let index = 0; index < arr.length; index++) {
		fn(arr[index]);
	}
};

function addAllToSet(set, otherSet) {
	for (const item of otherSet) {
		set.add(item);
	}
}

class Compilation extends Tapable {
	constructor(compiler) {
		super();
		this.hooks = {
			buildModule: new SyncHook(["module"]),
			rebuildModule: new SyncHook(["module"]),
			failedModule: new SyncHook(["module", "error"]),
			succeedModule: new SyncHook(["module"]),

			finishModules: new SyncHook(["modules"]),
			finishRebuildingModule: new SyncHook(["module"]),

			unseal: new SyncHook([]),
			seal: new SyncHook([]),

			optimizeDependenciesBasic: new SyncBailHook(["modules"]),
			optimizeDependencies: new SyncBailHook(["modules"]),
			optimizeDependenciesAdvanced: new SyncBailHook(["modules"]),
			afterOptimizeDependencies: new SyncHook(["modules"]),

			optimize: new SyncHook([]),

			optimizeModulesBasic: new SyncBailHook(["modules"]),
			optimizeModules: new SyncBailHook(["modules"]),
			optimizeModulesAdvanced: new SyncBailHook(["modules"]),
			afterOptimizeModules: new SyncHook(["modules"]),

			optimizeChunksBasic: new SyncBailHook(["chunks", "chunkGroups"]),
			optimizeChunks: new SyncBailHook(["chunks", "chunkGroups"]),
			optimizeChunksAdvanced: new SyncBailHook(["chunks", "chunkGroups"]),
			afterOptimizeChunks: new SyncHook(["chunks", "chunkGroups"]),

			optimizeTree: new AsyncSeriesHook(["chunks", "modules"]),
			afterOptimizeTree: new SyncHook(["chunks", "modules"]),

			optimizeChunkModulesBasic: new SyncBailHook(["chunks", "modules"]),
			optimizeChunkModules: new SyncBailHook(["chunks", "modules"]),
			optimizeChunkModulesAdvanced: new SyncBailHook(["chunks", "modules"]),
			afterOptimizeChunkModules: new SyncHook(["chunks", "modules"]),
			shouldRecord: new SyncBailHook([]),

			reviveModules: new SyncHook(["modules", "records"]),
			optimizeModuleOrder: new SyncHook(["modules"]),
			advancedOptimizeModuleOrder: new SyncHook(["modules"]),
			beforeModuleIds: new SyncHook(["modules"]),
			moduleIds: new SyncHook(["modules"]),
			optimizeModuleIds: new SyncHook(["modules"]),
			afterOptimizeModuleIds: new SyncHook(["modules"]),

			reviveChunks: new SyncHook(["chunks", "records"]),
			optimizeChunkOrder: new SyncHook(["chunks"]),
			beforeChunkIds: new SyncHook(["chunks"]),
			optimizeChunkIds: new SyncHook(["chunks"]),
			afterOptimizeChunkIds: new SyncHook(["chunks"]),

			recordModules: new SyncHook(["modules", "records"]),
			recordChunks: new SyncHook(["chunks", "records"]),

			beforeHash: new SyncHook([]),
			contentHash: new SyncHook(["chunk"]),
			afterHash: new SyncHook([]),

			recordHash: new SyncHook(["records"]),

			record: new SyncHook(["compilation", "records"]),

			beforeModuleAssets: new SyncHook([]),
			shouldGenerateChunkAssets: new SyncBailHook([]),
			beforeChunkAssets: new SyncHook([]),
			additionalChunkAssets: new SyncHook(["chunks"]),

			additionalAssets: new AsyncSeriesHook([]),
			optimizeChunkAssets: new AsyncSeriesHook(["chunks"]),
			afterOptimizeChunkAssets: new SyncHook(["chunks"]),
			optimizeAssets: new AsyncSeriesHook(["assets"]),
			afterOptimizeAssets: new SyncHook(["assets"]),

			needAdditionalSeal: new SyncBailHook([]),
			afterSeal: new AsyncSeriesHook([]),

			chunkHash: new SyncHook(["chunk", "chunkHash"]),
			moduleAsset: new SyncHook(["module", "filename"]),
			chunkAsset: new SyncHook(["chunk", "filename"]),

			assetPath: new SyncWaterfallHook(["filename", "data"]), // TODO MainTemplate

			needAdditionalPass: new SyncBailHook([]),
			childCompiler: new SyncHook([
				"childCompiler",
				"compilerName",
				"compilerIndex"
			]),

			// TODO the following hooks are weirdly located here
			// TODO move them for webpack 5
			normalModuleLoader: new SyncHook(["loaderContext", "module"]),

			optimizeExtractedChunksBasic: new SyncBailHook(["chunks"]),
			optimizeExtractedChunks: new SyncBailHook(["chunks"]),
			optimizeExtractedChunksAdvanced: new SyncBailHook(["chunks"]),
			afterOptimizeExtractedChunks: new SyncHook(["chunks"])
		};
		this._pluginCompat.tap("Compilation", options => {
			switch (options.name) {
				case "optimize-tree":
				case "additional-assets":
				case "optimize-chunk-assets":
				case "optimize-assets":
				case "after-seal":
					options.async = true;
					break;
			}
		});
		this.compiler = compiler;
		this.resolverFactory = compiler.resolverFactory;
		this.inputFileSystem = compiler.inputFileSystem;
		this.requestShortener = compiler.requestShortener;

		const options = (this.options = compiler.options);
		this.outputOptions = options && options.output;
		this.bail = options && options.bail;
		this.profile = options && options.profile;
		this.performance = options && options.performance;

		this.mainTemplate = new MainTemplate(this.outputOptions);
		this.chunkTemplate = new ChunkTemplate(this.outputOptions);
		this.hotUpdateChunkTemplate = new HotUpdateChunkTemplate(
			this.outputOptions
		);
		this.runtimeTemplate = new RuntimeTemplate(
			this.outputOptions,
			this.requestShortener
		);
		this.moduleTemplates = {
			javascript: new ModuleTemplate(this.runtimeTemplate),
			webassembly: new ModuleTemplate(this.runtimeTemplate)
		};

		this.semaphore = new Semaphore(options.parallelism || 100);

		this.entries = [];
		this._preparedEntrypoints = [];
		this.entrypoints = new Map();
		this.chunks = [];
		this.chunkGroups = [];
		this.namedChunkGroups = new Map();
		this.namedChunks = new Map();
		this.modules = [];
		this._modules = new Map();
		this.cache = null;
		this.records = null;
		this.nextFreeModuleIndex = undefined;
		this.nextFreeModuleIndex2 = undefined;
		this.additionalChunkAssets = [];
		this.assets = {};
		this.errors = [];
		this.warnings = [];
		this.children = [];
		this.dependencyFactories = new Map();
		this.dependencyTemplates = new Map();
		this.dependencyTemplates.set("hash", "");
		this.childrenCounters = {};
		this.usedChunkIds = null;
		this.usedModuleIds = null;
		this.fileTimestamps = undefined;
		this.contextTimestamps = undefined;
		this.compilationDependencies = undefined;

		this._buildingModules = new Map();
		this._rebuildingModules = new Map();
	}

	getStats() {
		return new Stats(this);
	}

	addModule(module, cacheGroup) {
		const identifier = module.identifier();
		const alreadyAddedModule = this._modules.get(identifier);
		if (alreadyAddedModule) {
			return {
				module: alreadyAddedModule,
				issuer: false,
				build: false,
				dependencies: false
			};
		}
		const cacheName = (cacheGroup || "m") + identifier;
		if (this.cache && this.cache[cacheName]) {
			const cacheModule = this.cache[cacheName];

			if (typeof cacheModule.updateCacheModule === "function")
				cacheModule.updateCacheModule(module);

			let rebuild = true;
			if (this.fileTimestamps && this.contextTimestamps) {
				rebuild = cacheModule.needRebuild(
					this.fileTimestamps,
					this.contextTimestamps
				);
			}

			if (!rebuild) {
				cacheModule.disconnect();
				this._modules.set(identifier, cacheModule);
				this.modules.push(cacheModule);
				for (const err of cacheModule.errors) this.errors.push(err);
				for (const err of cacheModule.warnings) this.warnings.push(err);
				return {
					module: cacheModule,
					issuer: true,
					build: false,
					dependencies: true
				};
			}
			cacheModule.unbuild();
			module = cacheModule;
		}
		this._modules.set(identifier, module);
		if (this.cache) {
			this.cache[cacheName] = module;
		}
		this.modules.push(module);
		return {
			module: module,
			issuer: true,
			build: true,
			dependencies: true
		};
	}

	getModule(module) {
		const identifier = module.identifier();
		return this._modules.get(identifier);
	}

	findModule(identifier) {
		return this._modules.get(identifier);
	}

	waitForBuildingFinished(module, callback) {
		let callbackList = this._buildingModules.get(module);
		if (callbackList) {
			callbackList.push(() => callback());
		} else {
			process.nextTick(callback);
		}
	}

	buildModule(module, optional, origin, dependencies, thisCallback) {
		let callbackList = this._buildingModules.get(module);
		if (callbackList) {
			callbackList.push(thisCallback);
			return;
		}
		this._buildingModules.set(module, (callbackList = [thisCallback]));

		const callback = err => {
			this._buildingModules.delete(module);
			for (const cb of callbackList) cb(err);
		};

		this.hooks.buildModule.call(module);
		module.build(
			this.options,
			this,
			this.resolverFactory.get("normal", module.resolveOptions),
			this.inputFileSystem,
			error => {
				const errors = module.errors;
				for (let indexError = 0; indexError < errors.length; indexError++) {
					const err = errors[indexError];
					err.origin = origin;
					err.dependencies = dependencies;
					if (optional) this.warnings.push(err);
					else this.errors.push(err);
				}

				const warnings = module.warnings;
				for (
					let indexWarning = 0;
					indexWarning < warnings.length;
					indexWarning++
				) {
					const war = warnings[indexWarning];
					war.origin = origin;
					war.dependencies = dependencies;
					this.warnings.push(war);
				}
				module.dependencies.sort(Dependency.compare);
				if (error) {
					this.hooks.failedModule.call(module, error);
					return callback(error);
				}
				this.hooks.succeedModule.call(module);
				return callback();
			}
		);
	}

	processModuleDependencies(module, callback) {
		const dependencies = new Map();

		const addDependency = dep => {
			const resourceIdent = dep.getResourceIdentifier();
			if (resourceIdent) {
				const factory = this.dependencyFactories.get(dep.constructor);
				if (factory === undefined)
					throw new Error(
						`No module factory available for dependency type: ${
							dep.constructor.name
						}`
					);
				let innerMap = dependencies.get(factory);
				if (innerMap === undefined)
					dependencies.set(factory, (innerMap = new Map()));
				let list = innerMap.get(resourceIdent);
				if (list === undefined) innerMap.set(resourceIdent, (list = []));
				list.push(dep);
			}
		};

		const addDependenciesBlock = block => {
			if (block.dependencies) {
				iterationOfArrayCallback(block.dependencies, addDependency);
			}
			if (block.blocks) {
				iterationOfArrayCallback(block.blocks, addDependenciesBlock);
			}
			if (block.variables) {
				iterationBlockVariable(block.variables, addDependency);
			}
		};

		try {
			addDependenciesBlock(module);
		} catch (e) {
			callback(e);
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

		this.addModuleDependencies(
			module,
			sortedDependencies,
			this.bail,
			null,
			true,
			callback
		);
	}

	addModuleDependencies(
		module,
		dependencies,
		bail,
		cacheGroup,
		recursive,
		callback
	) {
		let _this = this;
		const start = _this.profile && Date.now();
		const currentProfile = _this.profile && {};

		asyncLib.forEach(
			dependencies,
			(item, callback) => {
				const dependencies = item.dependencies;

				const errorAndCallback = err => {
					err.origin = module;
					_this.errors.push(err);
					if (bail) {
						callback(err);
					} else {
						callback();
					}
				};
				const warningAndCallback = err => {
					err.origin = module;
					_this.warnings.push(err);
					callback();
				};

				const semaphore = _this.semaphore;
				semaphore.acquire(() => {
					if (_this === null) return semaphore.release();

					const factory = item.factory;
					factory.create(
						{
							contextInfo: {
								issuer: module.nameForCondition && module.nameForCondition(),
								compiler: _this.compiler.name
							},
							resolveOptions: module.resolveOptions,
							context: module.context,
							dependencies: dependencies
						},
						(err, dependentModule) => {
							if (_this === null) return semaphore.release();

							let afterFactory;

							const isOptional = () => {
								return dependencies.every(d => d.optional);
							};

							const errorOrWarningAndCallback = err => {
								if (isOptional()) {
									return warningAndCallback(err);
								} else {
									return errorAndCallback(err);
								}
							};

							if (err) {
								semaphore.release();
								return errorOrWarningAndCallback(
									new ModuleNotFoundError(module, err, dependencies)
								);
							}
							if (!dependentModule) {
								semaphore.release();
								return process.nextTick(callback);
							}
							if (currentProfile) {
								afterFactory = Date.now();
								currentProfile.factory = afterFactory - start;
							}

							const iterationDependencies = depend => {
								for (let index = 0; index < depend.length; index++) {
									const dep = depend[index];
									dep.module = dependentModule;
									dependentModule.addReason(module, dep);
								}
							};

							const addModuleResult = _this.addModule(
								dependentModule,
								cacheGroup
							);
							dependentModule = addModuleResult.module;
							iterationDependencies(dependencies);

							const afterBuild = () => {
								if (currentProfile) {
									const afterBuilding = Date.now();
									currentProfile.building = afterBuilding - afterFactory;
								}

								if (recursive && addModuleResult.dependencies) {
									_this.processModuleDependencies(dependentModule, callback);
								} else {
									return callback();
								}
							};

							if (addModuleResult.issuer) {
								if (currentProfile) {
									dependentModule.profile = currentProfile;
								}

								dependentModule.issuer = module;
							} else {
								if (_this.profile) {
									if (module.profile) {
										const time = Date.now() - start;
										if (
											!module.profile.dependencies ||
											time > module.profile.dependencies
										) {
											module.profile.dependencies = time;
										}
									}
								}
							}

							if (addModuleResult.build) {
								_this.buildModule(
									dependentModule,
									isOptional(),
									module,
									dependencies,
									err => {
										if (_this === null) return semaphore.release();

										if (err) {
											semaphore.release();
											return errorOrWarningAndCallback(err);
										}

										if (currentProfile) {
											const afterBuilding = Date.now();
											currentProfile.building = afterBuilding - afterFactory;
										}

										semaphore.release();
										afterBuild();
									}
								);
							} else {
								semaphore.release();
								_this.waitForBuildingFinished(dependentModule, afterBuild);
							}
						}
					);
				});
			},
			err => {
				// In V8, the Error objects keep a reference to the functions on the stack. These warnings &
				// errors are created inside closures that keep a reference to the Compilation, so errors are
				// leaking the Compilation object.

				if (err) {
					err.stack = err.stack;
					return callback(err);
				}

				return process.nextTick(callback);
			}
		);
	}

	_addModuleChain(context, dependency, onModule, callback) {
		const start = this.profile && Date.now();
		const currentProfile = this.profile && {};

		const errorAndCallback = this.bail
			? err => {
					callback(err);
			  }
			: err => {
					err.dependencies = [dependency];
					this.errors.push(err);
					callback();
			  };

		if (
			typeof dependency !== "object" ||
			dependency === null ||
			!dependency.constructor
		) {
			throw new Error("Parameter 'dependency' must be a Dependency");
		}

		const moduleFactory = this.dependencyFactories.get(dependency.constructor);
		if (!moduleFactory) {
			throw new Error(
				`No dependency factory available for this dependency type: ${
					dependency.constructor.name
				}`
			);
		}

		this.semaphore.acquire(() => {
			moduleFactory.create(
				{
					contextInfo: {
						issuer: "",
						compiler: this.compiler.name
					},
					context: context,
					dependencies: [dependency]
				},
				(err, module) => {
					if (err) {
						this.semaphore.release();
						return errorAndCallback(new EntryModuleNotFoundError(err));
					}

					let afterFactory;

					if (currentProfile) {
						afterFactory = Date.now();
						currentProfile.factory = afterFactory - start;
					}

					const addModuleResult = this.addModule(module);
					module = addModuleResult.module;

					onModule(module);

					dependency.module = module;
					module.addReason(null, dependency);

					const afterBuild = () => {
						if (currentProfile) {
							const afterBuilding = Date.now();
							currentProfile.building = afterBuilding - afterFactory;
						}

						if (addModuleResult.dependencies) {
							this.processModuleDependencies(module, err => {
								if (err) return callback(err);
								callback(null, module);
							});
						} else {
							return callback(null, module);
						}
					};

					if (addModuleResult.issuer) {
						if (currentProfile) {
							module.profile = currentProfile;
						}
					}

					if (addModuleResult.build) {
						this.buildModule(module, false, null, null, err => {
							if (err) {
								this.semaphore.release();
								return errorAndCallback(err);
							}

							if (currentProfile) {
								const afterBuilding = Date.now();
								currentProfile.building = afterBuilding - afterFactory;
							}

							this.semaphore.release();
							afterBuild();
						});
					} else {
						this.semaphore.release();
						this.waitForBuildingFinished(module, afterBuild);
					}
				}
			);
		});
	}

	addEntry(context, entry, name, callback) {
		const slot = {
			name: name,
			request: entry.request,
			module: null
		};
		this._preparedEntrypoints.push(slot);
		this._addModuleChain(
			context,
			entry,
			module => {
				this.entries.push(module);
			},
			(err, module) => {
				if (err) {
					return callback(err);
				}

				if (module) {
					slot.module = module;
				} else {
					const idx = this._preparedEntrypoints.indexOf(slot);
					this._preparedEntrypoints.splice(idx, 1);
				}
				return callback(null, module);
			}
		);
	}

	prefetch(context, dependency, callback) {
		this._addModuleChain(
			context,
			dependency,
			module => {
				module.prefetched = true;
			},
			callback
		);
	}

	rebuildModule(module, thisCallback) {
		let callbackList = this._rebuildingModules.get(module);
		if (callbackList) {
			callbackList.push(thisCallback);
			return;
		}
		this._rebuildingModules.set(module, (callbackList = [thisCallback]));

		const callback = err => {
			this._rebuildingModules.delete(module);
			for (const cb of callbackList) cb(err);
		};

		this.hooks.rebuildModule.call(module);
		const oldDependencies = module.dependencies.slice();
		const oldVariables = module.variables.slice();
		const oldBlocks = module.blocks.slice();
		module.unbuild();
		this.buildModule(module, false, module, null, err => {
			if (err) {
				this.hooks.finishRebuildingModule.call(module);
				return callback(err);
			}

			this.processModuleDependencies(module, err => {
				if (err) return callback(err);
				this.removeReasonsOfDependencyBlock(module, {
					dependencies: oldDependencies,
					variables: oldVariables,
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

		for (let index = 0; index < modules.length; index++) {
			const module = modules[index];
			this.reportDependencyErrorsAndWarnings(module, [module]);
		}
	}

	unseal() {
		this.hooks.unseal.call();
		this.chunks.length = 0;
		this.chunkGroups.length = 0;
		this.namedChunks.clear();
		this.namedChunkGroups.clear();
		this.additionalChunkAssets.length = 0;
		this.assets = {};
		for (const module of this.modules) {
			module.unseal();
		}
	}

	seal(callback) {
		this.hooks.seal.call();

		while (
			this.hooks.optimizeDependenciesBasic.call(this.modules) ||
			this.hooks.optimizeDependencies.call(this.modules) ||
			this.hooks.optimizeDependenciesAdvanced.call(this.modules)
		) {
			/* empty */
		}
		this.hooks.afterOptimizeDependencies.call(this.modules);

		this.nextFreeModuleIndex = 0;
		this.nextFreeModuleIndex2 = 0;
		for (const preparedEntrypoint of this._preparedEntrypoints) {
			const module = preparedEntrypoint.module;
			const name = preparedEntrypoint.name;
			const chunk = this.addChunk(name);
			const entrypoint = new Entrypoint(name);
			entrypoint.setRuntimeChunk(chunk);
			entrypoint.addOrigin(null, name, preparedEntrypoint.request);
			this.namedChunkGroups.set(name, entrypoint);
			this.entrypoints.set(name, entrypoint);
			this.chunkGroups.push(entrypoint);

			GraphHelpers.connectChunkGroupAndChunk(entrypoint, chunk);
			GraphHelpers.connectChunkAndModule(chunk, module);

			chunk.entryModule = module;
			chunk.name = name;

			this.assignIndex(module);
			this.assignDepth(module);
		}
		this.processDependenciesBlocksForChunkGroups(this.chunkGroups);
		this.sortModules(this.modules);
		this.hooks.optimize.call();

		while (
			this.hooks.optimizeModulesBasic.call(this.modules) ||
			this.hooks.optimizeModules.call(this.modules) ||
			this.hooks.optimizeModulesAdvanced.call(this.modules)
		) {
			/* empty */
		}
		this.hooks.afterOptimizeModules.call(this.modules);

		while (
			this.hooks.optimizeChunksBasic.call(this.chunks, this.chunkGroups) ||
			this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups) ||
			this.hooks.optimizeChunksAdvanced.call(this.chunks, this.chunkGroups)
		) {
			/* empty */
		}
		this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);

		this.hooks.optimizeTree.callAsync(this.chunks, this.modules, err => {
			if (err) {
				return callback(err);
			}

			this.hooks.afterOptimizeTree.call(this.chunks, this.modules);

			while (
				this.hooks.optimizeChunkModulesBasic.call(this.chunks, this.modules) ||
				this.hooks.optimizeChunkModules.call(this.chunks, this.modules) ||
				this.hooks.optimizeChunkModulesAdvanced.call(this.chunks, this.modules)
			) {
				/* empty */
			}
			this.hooks.afterOptimizeChunkModules.call(this.chunks, this.modules);

			const shouldRecord = this.hooks.shouldRecord.call() !== false;

			this.hooks.reviveModules.call(this.modules, this.records);
			this.hooks.optimizeModuleOrder.call(this.modules);
			this.hooks.advancedOptimizeModuleOrder.call(this.modules);
			this.hooks.beforeModuleIds.call(this.modules);
			this.hooks.moduleIds.call(this.modules);
			this.applyModuleIds();
			this.hooks.optimizeModuleIds.call(this.modules);
			this.hooks.afterOptimizeModuleIds.call(this.modules);

			this.sortItemsWithModuleIds();

			this.hooks.reviveChunks.call(this.chunks, this.records);
			this.hooks.optimizeChunkOrder.call(this.chunks);
			this.hooks.beforeChunkIds.call(this.chunks);
			this.applyChunkIds();
			this.hooks.optimizeChunkIds.call(this.chunks);
			this.hooks.afterOptimizeChunkIds.call(this.chunks);

			this.sortItemsWithChunkIds();

			if (shouldRecord)
				this.hooks.recordModules.call(this.modules, this.records);
			if (shouldRecord) this.hooks.recordChunks.call(this.chunks, this.records);

			this.hooks.beforeHash.call();
			this.createHash();
			this.hooks.afterHash.call();

			if (shouldRecord) this.hooks.recordHash.call(this.records);

			this.hooks.beforeModuleAssets.call();
			this.createModuleAssets();
			if (this.hooks.shouldGenerateChunkAssets.call() !== false) {
				this.hooks.beforeChunkAssets.call();
				this.createChunkAssets();
			}
			this.hooks.additionalChunkAssets.call(this.chunks);
			this.summarizeDependencies();
			if (shouldRecord) this.hooks.record.call(this, this.records);

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
		});
	}

	sortModules(modules) {
		modules.sort(byIndexOrIdentifier);
	}

	reportDependencyErrorsAndWarnings(module, blocks) {
		for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
			const block = blocks[indexBlock];
			const dependencies = block.dependencies;

			for (let indexDep = 0; indexDep < dependencies.length; indexDep++) {
				const d = dependencies[indexDep];

				const warnings = d.getWarnings();
				if (warnings) {
					for (let indexWar = 0; indexWar < warnings.length; indexWar++) {
						const w = warnings[indexWar];

						const warning = new ModuleDependencyWarning(module, w, d.loc);
						this.warnings.push(warning);
					}
				}
				const errors = d.getErrors();
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

	addChunkInGroup(name, module, loc, request) {
		if (name) {
			const chunkGroup = this.namedChunkGroups.get(name);
			if (chunkGroup !== undefined) {
				if (module) {
					chunkGroup.addOrigin(module, loc, request);
				}
				return chunkGroup;
			}
		}
		const chunkGroup = new ChunkGroup(name);
		if (module) chunkGroup.addOrigin(module, loc, request);
		const chunk = this.addChunk(name);

		GraphHelpers.connectChunkGroupAndChunk(chunkGroup, chunk);

		this.chunkGroups.push(chunkGroup);
		if (name) {
			this.namedChunkGroups.set(name, chunkGroup);
		}
		return chunkGroup;
	}

	addChunk(name) {
		if (name) {
			const chunk = this.namedChunks.get(name);
			if (chunk !== undefined) {
				return chunk;
			}
		}
		const chunk = new Chunk(name);
		this.chunks.push(chunk);
		if (name) {
			this.namedChunks.set(name, chunk);
		}
		return chunk;
	}

	assignIndex(module) {
		const _this = this;

		const assignIndexToModule = module => {
			// enter module
			if (typeof module.index !== "number") {
				module.index = _this.nextFreeModuleIndex++;

				// leave module
				queue.push(() => (module.index2 = _this.nextFreeModuleIndex2++));

				// enter it as block
				assignIndexToDependencyBlock(module);
			}
		};

		const assignIndexToDependency = dependency => {
			if (dependency.module) {
				queue.push(() => assignIndexToModule(dependency.module));
			}
		};

		const assignIndexToDependencyBlock = block => {
			let allDependencies = [];

			const iteratorDependency = d => allDependencies.push(d);

			const iteratorBlock = b =>
				queue.push(() => assignIndexToDependencyBlock(b));

			if (block.variables) {
				iterationBlockVariable(block.variables, iteratorDependency);
			}

			if (block.dependencies) {
				iterationOfArrayCallback(block.dependencies, iteratorDependency);
			}
			if (block.blocks) {
				const blocks = block.blocks;
				let indexBlock = blocks.length;
				while (indexBlock--) {
					iteratorBlock(blocks[indexBlock]);
				}
			}

			let indexAll = allDependencies.length;
			while (indexAll--) {
				iteratorAllDependencies(allDependencies[indexAll]);
			}
		};

		const queue = [
			() => {
				assignIndexToModule(module);
			}
		];

		const iteratorAllDependencies = d => {
			queue.push(() => assignIndexToDependency(d));
		};

		while (queue.length) {
			queue.pop()();
		}
	}

	assignDepth(module) {
		const queue = new Set([module]);
		let depth;

		module.depth = 0;

		const enqueueJob = module => {
			const d = module.depth;
			if (typeof d === "number" && d <= depth) return;
			queue.add(module);
			module.depth = depth;
		};

		const assignDepthToDependency = (dependency, depth) => {
			if (dependency.module) {
				enqueueJob(dependency.module);
			}
		};

		const assignDepthToDependencyBlock = block => {
			if (block.variables) {
				iterationBlockVariable(block.variables, assignDepthToDependency);
			}

			if (block.dependencies) {
				iterationOfArrayCallback(block.dependencies, assignDepthToDependency);
			}

			if (block.blocks) {
				iterationOfArrayCallback(block.blocks, assignDepthToDependencyBlock);
			}
		};

		for (module of queue) {
			queue.delete(module);
			depth = module.depth;

			depth++;
			assignDepthToDependencyBlock(module);
		}
	}

	// This method creates the Chunk graph from the Module graph
	processDependenciesBlocksForChunkGroups(inputChunkGroups) {
		// Process is splitting into two parts:
		// Part one traverse the module graph and builds a very basic chunks graph
		//   in chunkDependencies.
		// Part two traverse every possible way through the basic chunk graph and
		//   tracks the available modules. While traversing it connects chunks with
		//   eachother and Blocks with Chunks. It stops traversing when all modules
		//   for a chunk are already available. So it doesn't connect unneeded chunks.

		const chunkDependencies = new Map(); // Map<Chunk, Array<{Module, Chunk}>>
		const allCreatedChunkGroups = new Set();

		// PART ONE

		const blockChunkGroups = new Map();

		// Start with the provided modules/chunks
		const queue = inputChunkGroups.map(chunkGroup => ({
			block: chunkGroup.chunks[0].entryModule,
			module: chunkGroup.chunks[0].entryModule,
			chunk: chunkGroup.chunks[0],
			chunkGroup
		}));

		let module, block, chunk, chunkGroup;

		// For each async Block in graph
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
					c = this.addChunkInGroup(b.chunkName, module, b.loc, b.request);
					blockChunkGroups.set(b, c);
					allCreatedChunkGroups.add(c);
				}
			} else {
				c.addOrigin(module, b.loc, b.request);
			}

			// 2. We store the Block+Chunk mapping as dependency for the chunk
			let deps = chunkDependencies.get(chunkGroup);
			if (!deps) chunkDependencies.set(chunkGroup, (deps = []));
			deps.push({
				block: b,
				chunkGroup: c
			});

			// 3. We enqueue the DependenciesBlock for traversal
			queue.push({
				block: b,
				module: module,
				chunk: c.chunks[0],
				chunkGroup: c
			});
		};

		// For each Dependency in the graph
		const iteratorDependency = d => {
			// We skip Dependencies without Reference
			const ref = d.getReference();
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
			// We connect Module and Chunk when not already done
			if (chunk.addModule(refModule)) {
				refModule.addChunk(chunk);

				// And enqueue the Module for traversal
				queue.push({
					block: refModule,
					module: refModule,
					chunk,
					chunkGroup
				});
			}
		};

		// Iterative traversal of the Module graph
		// Recursive would be simpler to write but could result in Stack Overflows
		while (queue.length) {
			const queueItem = queue.pop();
			module = queueItem.module;
			block = queueItem.block;
			chunk = queueItem.chunk;
			chunkGroup = queueItem.chunkGroup;

			// Traverse all variables, Dependencies and Blocks
			if (block.variables) {
				iterationBlockVariable(block.variables, iteratorDependency);
			}

			if (block.dependencies) {
				iterationOfArrayCallback(block.dependencies, iteratorDependency);
			}

			if (block.blocks) {
				iterationOfArrayCallback(block.blocks, iteratorBlock);
			}
		}

		// PART TWO

		let availableModules;
		let newAvailableModules;
		const queue2 = new Queue(
			inputChunkGroups.map(chunkGroup => ({
				chunkGroup,
				availableModules: new Set()
			}))
		);

		// Helper function to check if all modules of a chunk are available
		const areModulesAvailable = (chunkGroup, availableModules) => {
			for (const chunk of chunkGroup.chunks) {
				for (const module of chunk.modulesIterable) {
					if (!availableModules.has(module)) return false;
				}
			}
			return true;
		};

		// For each edge in the basic chunk graph
		const filterFn = dep => {
			// Filter egdes that are not needed because all modules are already available
			// This also filters circular dependencies in the chunks graph
			const depChunkGroup = dep.chunkGroup;
			if (areModulesAvailable(depChunkGroup, newAvailableModules)) return false; // break all modules are already available
			return true;
		};

		const minAvailableModulesMap = new Map();

		// Iterative traversing of the basic chunk graph
		while (queue2.length) {
			const queueItem = queue2.dequeue();
			chunkGroup = queueItem.chunkGroup;
			availableModules = queueItem.availableModules;

			// 1. Get minimal available modules
			// It doesn't make sense to traverse a chunk again with more available modules.
			// This step calculates the minimal available modules and skips traversal when
			// the list didn't shrink.
			let minAvailableModules = minAvailableModulesMap.get(chunkGroup);
			if (minAvailableModules === undefined) {
				minAvailableModulesMap.set(chunkGroup, new Set(availableModules));
			} else {
				let deletedModules = false;
				for (const m of minAvailableModules) {
					if (!availableModules.has(m)) {
						minAvailableModules.delete(m);
						deletedModules = true;
					}
				}
				if (!deletedModules) continue;
				availableModules = minAvailableModules;
			}

			// 2. Get the edges at this point of the graph
			const deps = chunkDependencies.get(chunkGroup);
			if (!deps) continue;
			if (deps.length === 0) continue;

			// 3. Create a new Set of available modules at this points
			newAvailableModules = new Set(availableModules);
			for (const chunk of chunkGroup.chunks)
				for (const m of chunk.modulesIterable) newAvailableModules.add(m);

			// 4. Filter edges with available modules
			const filteredDeps = deps.filter(filterFn);

			// 5. Foreach remaining edge
			const nextChunkGroups = new Set();
			for (let i = 0; i < filteredDeps.length; i++) {
				const dep = filteredDeps[i];
				const depChunkGroup = dep.chunkGroup;
				const depBlock = dep.block;

				// 6. Connect block with chunk
				GraphHelpers.connectDependenciesBlockAndChunkGroup(
					depBlock,
					depChunkGroup
				);

				// 7. Connect chunk with parent
				GraphHelpers.connectChunkGroupParentAndChild(chunkGroup, depChunkGroup);

				nextChunkGroups.add(depChunkGroup);
			}

			// 8. Enqueue further traversal
			for (const nextChunkGroup of nextChunkGroups) {
				queue2.enqueue({
					chunkGroup: nextChunkGroup,
					availableModules: newAvailableModules
				});
			}
		}

		// Remove all unconnected chunk groups
		for (const chunkGroup of allCreatedChunkGroups) {
			if (chunkGroup.getNumberOfParents() === 0) {
				for (const chunk of chunkGroup.chunks) {
					const idx = this.chunks.indexOf(chunk);
					if (idx >= 0) this.chunks.splice(idx, 1);
					chunk.remove("unconnected");
				}
				chunkGroup.remove("unconnected");
			}
		}
	}

	removeReasonsOfDependencyBlock(module, block) {
		const iteratorDependency = d => {
			if (!d.module) {
				return;
			}
			if (d.module.removeReason(module, d)) {
				for (const chunk of d.module.chunksIterable) {
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

		if (block.variables) {
			iterationBlockVariable(block.variables, iteratorDependency);
		}
	}

	patchChunksAfterReasonRemoval(module, chunk) {
		if (!module.hasReasons()) {
			this.removeReasonsOfDependencyBlock(module, module);
		}
		if (!module.hasReasonForChunk(chunk)) {
			if (module.removeChunk(chunk)) {
				this.removeChunkFromDependencies(module, chunk);
			}
		}
	}

	removeChunkFromDependencies(block, chunk) {
		const iteratorDependency = d => {
			if (!d.module) {
				return;
			}
			this.patchChunksAfterReasonRemoval(d.module, chunk);
		};

		const blocks = block.blocks;
		for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
			const chunks = blocks[indexBlock].chunks;
			for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
				const blockChunk = chunks[indexChunk];
				chunk.removeChunk(blockChunk);
				blockChunk.removeParent(chunk);
				this.removeChunkFromDependencies(chunks, blockChunk);
			}
		}

		if (block.dependencies) {
			iterationOfArrayCallback(block.dependencies, iteratorDependency);
		}

		if (block.variables) {
			iterationBlockVariable(block.variables, iteratorDependency);
		}
	}

	applyModuleIds() {
		const unusedIds = [];
		let nextFreeModuleId = 0;
		const usedIds = new Set();
		if (this.usedModuleIds) {
			for (const id of this.usedModuleIds) {
				usedIds.add(id);
			}
		}

		const modules1 = this.modules;
		for (let indexModule1 = 0; indexModule1 < modules1.length; indexModule1++) {
			const module1 = modules1[indexModule1];
			if (module1.id !== null) {
				usedIds.add(module1.id);
			}
		}

		if (usedIds.size > 0) {
			let usedIdMax = -1;
			for (const usedIdKey of usedIds) {
				if (typeof usedIdKey !== "number") {
					continue;
				}

				usedIdMax = Math.max(usedIdMax, usedIdKey);
			}

			let lengthFreeModules = (nextFreeModuleId = usedIdMax + 1);

			while (lengthFreeModules--) {
				if (!usedIds.has(lengthFreeModules)) {
					unusedIds.push(lengthFreeModules);
				}
			}
		}

		const modules2 = this.modules;
		for (let indexModule2 = 0; indexModule2 < modules2.length; indexModule2++) {
			const module2 = modules2[indexModule2];
			if (module2.id === null) {
				if (unusedIds.length > 0) module2.id = unusedIds.pop();
				else module2.id = nextFreeModuleId++;
			}
		}
	}

	applyChunkIds() {
		const usedIds = new Set();

		// Get used ids from usedChunkIds property (i. e. from records)
		if (this.usedChunkIds) {
			for (const id of this.usedChunkIds) {
				if (typeof id !== "number") {
					continue;
				}

				usedIds.add(id);
			}
		}

		// Get used ids from existing chunks
		const chunks = this.chunks;
		for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			const chunk = chunks[indexChunk];
			const usedIdValue = chunk.id;

			if (typeof usedIdValue !== "number") {
				continue;
			}

			usedIds.add(usedIdValue);
		}

		// Calculate maximum assigned chunk id
		let nextFreeChunkId = -1;
		for (const id of usedIds) {
			nextFreeChunkId = Math.max(nextFreeChunkId, id);
		}
		nextFreeChunkId++;

		// Determine free chunk ids from 0 to maximum
		const unusedIds = [];
		if (nextFreeChunkId > 0) {
			let index = nextFreeChunkId;
			while (index--) {
				if (!usedIds.has(index)) {
					unusedIds.push(index);
				}
			}
		}

		// Assign ids to chunk which has no id
		for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			const chunk = chunks[indexChunk];
			if (chunk.id === null) {
				if (unusedIds.length > 0) chunk.id = unusedIds.pop();
				else chunk.id = nextFreeChunkId++;
			}
			if (!chunk.ids) {
				chunk.ids = [chunk.id];
			}
		}
	}

	sortItemsWithModuleIds() {
		this.modules.sort(byIdOrIdentifier);

		const modules = this.modules;
		for (let indexModule = 0; indexModule < modules.length; indexModule++) {
			modules[indexModule].sortItems(false);
		}

		const chunks = this.chunks;
		for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			chunks[indexChunk].sortItems(false);
		}
	}

	sortItemsWithChunkIds() {
		for (const chunkGroup of this.chunkGroups) {
			chunkGroup.sortItems();
		}

		this.chunks.sort(byId);

		for (
			let indexModule = 0;
			indexModule < this.modules.length;
			indexModule++
		) {
			this.modules[indexModule].sortItems(true);
		}

		const chunks = this.chunks;
		for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			chunks[indexChunk].sortItems(true);
		}

		const byMessage = (a, b) => {
			const ma = `${a.message}`;
			const mb = `${b.message}`;
			if (ma < mb) return -1;
			if (mb < ma) return 1;
			return 0;
		};

		this.errors.sort(byMessage);
		this.warnings.sort(byMessage);
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

		for (
			let indexModule = 0;
			indexModule < this.modules.length;
			indexModule++
		) {
			const module = this.modules[indexModule];

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

	createHash() {
		const outputOptions = this.outputOptions;
		const hashFunction = outputOptions.hashFunction;
		const hashDigest = outputOptions.hashDigest;
		const hashDigestLength = outputOptions.hashDigestLength;
		const hash = createHash(hashFunction);
		if (outputOptions.hashSalt) hash.update(outputOptions.hashSalt);
		this.mainTemplate.updateHash(hash);
		this.chunkTemplate.updateHash(hash);
		for (const key of Object.keys(this.moduleTemplates).sort())
			this.moduleTemplates[key].updateHash(hash);
		for (const child of this.children) hash.update(child.hash);
		for (const warning of this.warnings) hash.update(`${warning.message}`);
		for (const error of this.errors) hash.update(`${error.message}`);
		const modules = this.modules;
		for (let i = 0; i < modules.length; i++) {
			const module = modules[i];
			const moduleHash = createHash(hashFunction);
			module.updateHash(moduleHash);
			module.hash = moduleHash.digest(hashDigest);
			module.renderedHash = module.hash.substr(0, hashDigestLength);
		}
		// clone needed as sort below is inplace mutation
		const chunks = this.chunks.slice();
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
			return 0;
		});
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const chunkHash = createHash(hashFunction);
			if (outputOptions.hashSalt) chunkHash.update(outputOptions.hashSalt);
			chunk.updateHash(chunkHash);
			const template = chunk.hasRuntime()
				? this.mainTemplate
				: this.chunkTemplate;
			template.updateHashForChunk(chunkHash, chunk);
			this.hooks.chunkHash.call(chunk, chunkHash);
			chunk.hash = chunkHash.digest(hashDigest);
			hash.update(chunk.hash);
			chunk.renderedHash = chunk.hash.substr(0, hashDigestLength);
			this.hooks.contentHash.call(chunk);
		}
		this.fullHash = hash.digest(hashDigest);
		this.hash = this.fullHash.substr(0, hashDigestLength);
	}

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
		for (let i = 0; i < this.modules.length; i++) {
			const module = this.modules[i];
			if (module.buildInfo.assets) {
				for (const assetName of Object.keys(module.buildInfo.assets)) {
					const fileName = this.getPath(assetName);
					this.assets[fileName] = module.buildInfo.assets[assetName];
					this.hooks.moduleAsset.call(module, fileName);
				}
			}
		}
	}

	createChunkAssets() {
		const outputOptions = this.outputOptions;
		const cachedSourceMap = new Map();
		for (let i = 0; i < this.chunks.length; i++) {
			const chunk = this.chunks[i];
			chunk.files = [];
			let source;
			let file;
			let filenameTemplate;
			try {
				const template = chunk.hasRuntime()
					? this.mainTemplate
					: this.chunkTemplate;
				const manifest = template.getRenderManifest({
					chunk,
					hash: this.hash,
					fullHash: this.fullHash,
					outputOptions,
					moduleTemplates: this.moduleTemplates,
					dependencyTemplates: this.dependencyTemplates
				}); // [{ render(), filenameTemplate, pathOptions, identifier, hash }]
				for (const fileManifest of manifest) {
					const cacheName = fileManifest.identifier;
					const usedHash = fileManifest.hash;
					filenameTemplate = fileManifest.filenameTemplate;
					if (
						this.cache &&
						this.cache[cacheName] &&
						this.cache[cacheName].hash === usedHash
					) {
						source = this.cache[cacheName].source;
					} else {
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
						if (this.cache) {
							this.cache[cacheName] = {
								hash: usedHash,
								source
							};
						}
					}
					file = this.getPath(filenameTemplate, fileManifest.pathOptions);
					if (this.assets[file] && this.assets[file] !== source)
						throw new Error(
							`Conflict: Multiple assets emit to the same filename ${file}`
						);
					this.assets[file] = source;
					chunk.files.push(file);
					this.hooks.chunkAsset.call(chunk, file);
				}
			} catch (err) {
				this.errors.push(
					new ChunkRenderError(chunk, file || filenameTemplate, err)
				);
			}
		}
	}

	getPath(filename, data) {
		data = data || {};
		data.hash = data.hash || this.hash;
		return this.mainTemplate.getAssetPath(filename, data);
	}

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
		const usedIds = new Set();

		const modules = this.modules;
		for (let indexModule = 0; indexModule < modules.length; indexModule++) {
			const moduleId = modules[indexModule].id;
			if (moduleId === null) continue;
			if (usedIds.has(moduleId))
				throw new Error(`checkConstraints: duplicate module id ${moduleId}`);
			usedIds.add(moduleId);
		}

		const chunks = this.chunks;
		for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			const chunk = chunks[indexChunk];
			if (chunks.indexOf(chunk) !== indexChunk)
				throw new Error(
					`checkConstraints: duplicate chunk in compilation ${chunk.debugId}`
				);
		}

		for (const chunkGroup of this.chunkGroups) {
			chunkGroup.checkConstraints();
		}
	}
}

// TODO remove in webpack 5
Compilation.prototype.applyPlugins = util.deprecate(function(name, ...args) {
	this.hooks[
		name.replace(/[- ]([a-z])/g, match => match[1].toUpperCase())
	].call(...args);
}, "Compilation.applyPlugins is deprecated. Use new API on `.hooks` instead");

// TODO remove in webpack 5
Object.defineProperty(Compilation.prototype, "moduleTemplate", {
	configurable: false,
	get: util.deprecate(function() {
		return this.moduleTemplates.javascript;
	}, "Compilation.moduleTemplate: Use Compilation.moduleTemplates.javascript instead"),
	set: util.deprecate(function(value) {
		this.moduleTemplates.javascript = value;
	}, "Compilation.moduleTemplate: Use Compilation.moduleTemplates.javascript instead.")
});

module.exports = Compilation;
