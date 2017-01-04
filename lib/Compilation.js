"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
const async = require("async");
const crypto = require("crypto");
const Tapable = require("tapable");
const EntryModuleNotFoundError = require("./EntryModuleNotFoundError");
const ModuleNotFoundError = require("./ModuleNotFoundError");
const ModuleDependencyWarning = require("./ModuleDependencyWarning");
const Module = require("./Module");
const Chunk = require("./Chunk");
const Entrypoint = require("./Entrypoint");
const Stats = require("./Stats");
const MainTemplate = require("./MainTemplate");
const ChunkTemplate = require("./ChunkTemplate");
const HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");
const ModuleTemplate = require("./ModuleTemplate");
const Dependency = require("./Dependency");
const ChunkRenderError = require("./ChunkRenderError");
class Compilation extends Tapable {
	constructor(compiler) {
		super();
		this.compiler = compiler;
		this.resolvers = compiler.resolvers;
		this.inputFileSystem = compiler.inputFileSystem;
		const options = this.options = compiler.options;
		this.outputOptions = options && options.output;
		this.bail = options && options.bail;
		this.profile = options && options.profile;
		this.performance = options && options.performance;
		this.mainTemplate = new MainTemplate(this.outputOptions);
		this.chunkTemplate = new ChunkTemplate(this.outputOptions);
		this.hotUpdateChunkTemplate = new HotUpdateChunkTemplate(this.outputOptions);
		this.moduleTemplate = new ModuleTemplate(this.outputOptions);
		this.entries = [];
		this.preparedChunks = [];
		this.entrypoints = {};
		this.chunks = [];
		this.namedChunks = {};
		this.modules = [];
		this._modules = {};
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
	}

	templatesPlugin(name, fn) {
		this.mainTemplate.plugin(name, fn);
		this.chunkTemplate.plugin(name, fn);
	}

	addModule(module, cacheGroup) {
		cacheGroup = cacheGroup || "m"
		const identifier = module.identifier();
		if(this._modules[identifier]) {
			return false;
		}
		if(this.cache && this.cache[cacheGroup + identifier]) {
			const cacheModule = this.cache[cacheGroup + identifier];
			let rebuild = true;
			if(!cacheModule.error && cacheModule.cacheable && this.fileTimestamps && this.contextTimestamps) {
				rebuild = cacheModule.needRebuild(this.fileTimestamps, this.contextTimestamps);
			}
			if(!rebuild) {
				cacheModule.disconnect();
				this._modules[identifier] = cacheModule;
				this.modules.push(cacheModule);
				cacheModule.errors.forEach(function(err) {
					this.errors.push(err);
				}, this);
				cacheModule.warnings.forEach(function(err) {
					this.warnings.push(err);
				}, this);
				return cacheModule;
			} else {
				module.lastId = cacheModule.id;
			}
		}
		module.unbuild();
		this._modules[identifier] = module;
		if(this.cache) {
			this.cache[cacheGroup + identifier] = module;
		}
		this.modules.push(module);
		return true;
	}

	getModule(module) {
		const identifier = module.identifier();
		return this._modules[identifier];
	}

	findModule(identifier) {
		return this._modules[identifier];
	}

	buildModule(module, optional, origin, dependencies, thisCallback) {
		this.applyPlugins1("build-module", module);
		if(module.building) {
			return module.building.push(thisCallback);
		}
		const building = module.building = [thisCallback];

		function callback(err) {
			module.building = undefined;
			building.forEach(cb => {
				cb(err);
			});
		}

		module.build(this.options, this, this.resolvers.normal, this.inputFileSystem, (err) => {
			module.errors.forEach((err) => {
				err.origin = origin;
				err.dependencies = dependencies;
				if(optional) {
					this.warnings.push(err);
				} else {
					this.errors.push(err);
				}
			}, this);
			module.warnings.forEach((err) => {
				err.origin = origin;
				err.dependencies = dependencies;
				this.warnings.push(err);
			}, this);
			module.dependencies.sort(Dependency.compare);
			if(err) {
				this.applyPlugins2("failed-module", module, err);
				return callback(err);
			}
			this.applyPlugins1("succeed-module", module);
			return callback(undefined);
		});
	}

	processModuleDependencies(module, callback) {
		const dependencies = [];

		function addDependency(dep) {
			for(let i = 0; i < dependencies.length; i++) {
				if(dep.isEqualResource(dependencies[i][0])) {
					return dependencies[i].push(dep);
				}
			}
			dependencies.push([dep]);
		}

		function addDependenciesBlock(block) {
			if(block.dependencies) {
				block.dependencies.forEach(addDependency);
			}
			if(block.blocks) {
				block.blocks.forEach(addDependenciesBlock);
			}
			if(block.variables) {
				block.variables.forEach(v => {
					v.dependencies.forEach(addDependency);
				});
			}
		}

		addDependenciesBlock(module);
		this.addModuleDependencies(module, dependencies, this.bail, null, true, callback);
	}

	addModuleDependencies(module, dependencies, bail, cacheGroup, recursive, callback) {
		let self = this;
		const start = self.profile && +new Date();
		const factories = [];
		for(let i = 0; i < dependencies.length; i++) {
			const factory = self.dependencyFactories.get(dependencies[i][0].constructor);
			if(!factory) {
				return callback(new Error(`No module factory available for dependency type: ${dependencies[i][0].constructor.name}`));
			}
			factories[i] = [factory, dependencies[i]];
		}
		async.each(factories, function iteratorFactory(item, callback) {
			const dependencies = item[1];
			const errorAndCallback = function errorAndCallback(err) {
				err.origin = module;
				self.errors.push(err);
				if(bail) {
					callback(err);
				} else {
					callback();
				}
			};
			const warningAndCallback = function warningAndCallback(err) {
				err.origin = module;
				self.warnings.push(err);
				callback();
			};
			const factory = item[0];
			factory.create({
				contextInfo: {
					issuer: module.nameForCondition && module.nameForCondition()
				},
				context: module.context,
				dependencies
			}, function factoryCallback(err, dependentModule) {
				function isOptional() {
					return dependencies.filter(d => !d.optional).length === 0;
				}

				function errorOrWarningAndCallback(err) {
					if(isOptional()) {
						return warningAndCallback(err);
					} else {
						return errorAndCallback(err);
					}
				}

				if(err) {
					return errorOrWarningAndCallback(new ModuleNotFoundError(module, err, dependencies));
				}
				if(!dependentModule) {
					return process.nextTick(callback);
				}
				let afterFactory;
				if(self.profile) {
					if(!dependentModule.profile) {
						dependentModule.profile = {};
					}
					afterFactory = +new Date();
					dependentModule.profile.factory = afterFactory - start;
				}
				dependentModule.issuer = module;
				const newModule = self.addModule(dependentModule, cacheGroup);
				if(!newModule) {
					// from cache
					dependentModule = self.getModule(dependentModule);
					if(dependentModule.optional) {
						dependentModule.optional = isOptional();
					}
					dependencies.forEach(dep => {
						dep.module = dependentModule;
						dependentModule.addReason(module, dep);
					});
					if(self.profile) {
						if(!module.profile) {
							module.profile = {};
						}
						const time = +new Date() - start;
						if(!module.profile.dependencies || time > module.profile.dependencies) {
							module.profile.dependencies = time;
						}
					}
					return process.nextTick(callback);
				}
				if(newModule instanceof Module) {
					if(self.profile) {
						newModule.profile = dependentModule.profile;
					}
					newModule.optional = isOptional();
					newModule.issuer = dependentModule.issuer;
					dependentModule = newModule;
					dependencies.forEach(dep => {
						dep.module = dependentModule;
						dependentModule.addReason(module, dep);
					});
					if(self.profile) {
						const afterBuilding = +new Date();
						module.profile.building = afterBuilding - afterFactory;
					}
					if(recursive) {
						return process.nextTick(self.processModuleDependencies.bind(self, dependentModule, callback));
					} else {
						return process.nextTick(callback);
					}
				}
				dependentModule.optional = isOptional();
				dependencies.forEach(dep => {
					dep.module = dependentModule;
					dependentModule.addReason(module, dep);
				});
				self.buildModule(dependentModule, isOptional(), module, dependencies, (err) => {
					if(err) {
						return errorOrWarningAndCallback(err);
					}
					if(self.profile) {
						const afterBuilding = +new Date();
						dependentModule.profile.building = afterBuilding - afterFactory;
					}
					if(recursive) {
						self.processModuleDependencies(dependentModule, callback);
					} else {
						return callback();
					}
				});
			});
		}, function finalCallbackAddModuleDependencies(err) {
			// In V8, the Error objects keep a reference to the functions on the stack. These warnings &
			// errors are created inside closures that keep a reference to the Compilation, so errors are
			// leaking the Compilation object. Setting _this to null workarounds the following issue in V8.
			// https://bugs.chromium.org/p/chromium/issues/detail?id=612191
			self = null;
			if(err) {
				return callback(err);
			}
			return process.nextTick(callback);
		});
	}

	_addModuleChain(context, dependency, onModule, callback) {
		const start = this.profile && +new Date();
		const errorAndCallback = this.bail ? function errorAndCallback(err) {
			callback(err);
		} : function errorAndCallback(err) {
			err.dependencies = [dependency];
			this.errors.push(err);
			callback();
		}.bind(this);
		if(typeof dependency !== "object" || dependency === null || !dependency.constructor) {
			throw new Error("Parameter 'dependency' must be a Dependency");
		}
		const moduleFactory = this.dependencyFactories.get(dependency.constructor);
		if(!moduleFactory) {
			throw new Error(`No dependency factory available for this dependency type: ${dependency.constructor.name}`);
		}
		moduleFactory.create({
			context,
			dependencies: [dependency]
		}, (err, module) => {
			if(err) {
				return errorAndCallback(new EntryModuleNotFoundError(err));
			}
			let afterFactory;
			if(this.profile) {
				if(!module.profile) {
					module.profile = {};
				}
				afterFactory = +new Date();
				module.profile.factory = afterFactory - start;
			}
			const result = this.addModule(module);
			if(!result) {
				module = this.getModule(module);
				onModule(module);
				if(this.profile) {
					const afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}
				return callback(null, module);
			}
			if(result instanceof Module) {
				if(this.profile) {
					result.profile = module.profile;
				}
				module = result;
				onModule(module);
				moduleReady.call(this);
				return;
			}
			onModule(module);
			this.buildModule(module, false, null, null, (err) => {
				if(err) {
					return errorAndCallback(err);
				}
				if(this.profile) {
					const afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}
				moduleReady.call(this);
			});
			function moduleReady() {
				this.processModuleDependencies(module, (err) => {
					if(err) {
						return callback(err);
					}
					return callback(null, module);
				});
			}
		});
	}

	addEntry(context, entry, name, callback) {
		const slot = {
			name,
			module: null
		};
		this.preparedChunks.push(slot);
		this._addModuleChain(context, entry, module => {
			entry.module = module;
			this.entries.push(module);
			module.issuer = null;
		}, (err, module) => {
			if(err) {
				return callback(err);
			}
			if(module) {
				slot.module = module;
			} else {
				const idx = this.preparedChunks.indexOf(slot);
				this.preparedChunks.splice(idx, 1);
			}
			return callback();
		});
	}

	prefetch(context, dependency, callback) {
		this._addModuleChain(context, dependency, module => {
			module.prefetched = true;
			module.issuer = null;
		}, callback);
	}

	// todo: thisCallback has no this binding, this could cause confusion
	rebuildModule(module, thisCallback) {
		if(module.variables.length || module.blocks.length) {
			throw new Error("Cannot rebuild a complex module with variables or blocks");
		}
		if(module.rebuilding) {
			return module.rebuilding.push(thisCallback);
		}
		const rebuilding = module.rebuilding = [thisCallback];

		function callback(err) {
			module.rebuilding = undefined;
			rebuilding.forEach(cb => {
				cb(err);
			});
		}

		const deps = module.dependencies.slice();
		this.buildModule(module, false, module, null, err => {
			if(err) {
				return callback(err);
			}
			this.processModuleDependencies(module, err => {
				if(err) {
					return callback(err);
				}
				deps.forEach(function(d) {
					if(d.module && d.module.removeReason(module, d)) {
						module.chunks.forEach(function(chunk) {
							if(!d.module.hasReasonForChunk(chunk)) {
								if(d.module.removeChunk(chunk)) {
									this.removeChunkFromDependencies(d.module, chunk);
								}
							}
						}, this);
					}
				}, this);
				callback(undefined);
			});
		});
	}

	finish() {
		this.applyPlugins1("finish-modules", this.modules);
		this.modules.forEach(function(m) {
			this.reportDependencyWarnings(m, [m]);
		}, this);
	}

	unseal() {
		this.applyPlugins0("unseal");
		this.chunks.length = 0;
		this.namedChunks = {};
		this.additionalChunkAssets.length = 0;
		this.assets = {};
		this.modules.forEach(module => {
			module.unseal();
		});
	}

	seal(callback) {
		this.applyPlugins0("seal");
		this.nextFreeModuleIndex = 0;
		this.nextFreeModuleIndex2 = 0;
		this.preparedChunks.forEach(preparedChunk => {
			const module = preparedChunk.module;
			const chunk = this.addChunk(preparedChunk.name, module);
			const entrypoint = this.entrypoints[chunk.name] = new Entrypoint(chunk.name);
			entrypoint.unshiftChunk(chunk);
			chunk.addModule(module);
			module.addChunk(chunk);
			chunk.entryModule = module;
			this.assignIndex(module);
			this.assignDepth(module);
			this.processDependenciesBlockForChunk(module, chunk);
		}, this);
		this.sortModules(this.modules);
		this.applyPlugins0("optimize");
		while(this.applyPluginsBailResult1("optimize-modules-basic", this.modules)
		|| this.applyPluginsBailResult1("optimize-modules", this.modules)
		|| this.applyPluginsBailResult1("optimize-modules-advanced", this.modules)) {

		} // eslint-disable-line no-extra-semi
		this.applyPlugins1("after-optimize-modules", this.modules);
		while(this.applyPluginsBailResult1("optimize-chunks-basic", this.chunks)
		|| this.applyPluginsBailResult1("optimize-chunks", this.chunks)
		|| this.applyPluginsBailResult1("optimize-chunks-advanced", this.chunks)) {

		}
		this.applyPlugins1("after-optimize-chunks", this.chunks);
		this.applyPluginsAsyncSeries("optimize-tree", this.chunks, this.modules, (err) => {
			if(err) {
				return callback(err);
			}
			this.applyPlugins2("after-optimize-tree", this.chunks, this.modules);
			const shouldRecord = this.applyPluginsBailResult("should-record") !== false;
			this.sortItemsBeforeIds();
			this.applyPlugins2("revive-modules", this.modules, this.records);
			this.applyPlugins1("optimize-module-order", this.modules);
			this.applyPlugins1("advanced-optimize-module-order", this.modules);
			this.applyPlugins1("before-module-ids", this.modules);
			this.applyPlugins1("module-ids", this.modules);
			this.applyModuleIds();
			this.applyPlugins1("optimize-module-ids", this.modules);
			this.applyPlugins1("after-optimize-module-ids", this.modules);
			this.sortItemsWithModuleIds();
			this.applyPlugins2("revive-chunks", this.chunks, this.records);
			this.applyPlugins1("optimize-chunk-order", this.chunks);
			this.applyPlugins1("before-chunk-ids", this.chunks);
			this.applyChunkIds();
			this.applyPlugins1("optimize-chunk-ids", this.chunks);
			this.applyPlugins1("after-optimize-chunk-ids", this.chunks);
			this.sortItemsWithChunkIds();
			if(shouldRecord) {
				this.applyPlugins2("record-modules", this.modules, this.records);
			}
			if(shouldRecord) {
				this.applyPlugins2("record-chunks", this.chunks, this.records);
			}
			this.applyPlugins0("before-hash");
			this.createHash();
			this.applyPlugins0("after-hash");
			if(shouldRecord) {
				this.applyPlugins1("record-hash", this.records);
			}
			this.applyPlugins0("before-module-assets");
			this.createModuleAssets();
			if(this.applyPluginsBailResult("should-generate-chunk-assets") !== false) {
				this.applyPlugins0("before-chunk-assets");
				this.createChunkAssets();
			}
			this.applyPlugins1("additional-chunk-assets", this.chunks);
			this.summarizeDependencies();
			if(shouldRecord) {
				this.applyPlugins2("record", this, this.records);
			}
			this.applyPluginsAsync("additional-assets", (err) => {
				if(err) {
					return callback(err);
				}
				this.applyPluginsAsync("optimize-chunk-assets", this.chunks, (err) => {
					if(err) {
						return callback(err);
					}
					this.applyPlugins1("after-optimize-chunk-assets", this.chunks);
					this.applyPluginsAsync("optimize-assets", this.assets, (err) => {
						if(err) {
							return callback(err);
						}
						this.applyPlugins1("after-optimize-assets", this.assets);
						if(this.applyPluginsBailResult("need-additional-seal")) {
							this.unseal();
							return this.seal(callback);
						}
						return this.applyPluginsAsync("after-seal", callback);
					});
				});
			});
		});
	}

	sortModules(modules) {
		modules.sort((a, b) => {
			if(a.index < b.index) {
				return -1;
			}
			if(a.index > b.index) {
				return 1;
			}
			return 0;
		});
	}

	reportDependencyWarnings(module, blocks) {
		blocks.forEach(block => {
			block.dependencies.forEach(d => {
				const warnings = d.getWarnings();
				if(warnings) {
					warnings.forEach(w => {
						const warning = new ModuleDependencyWarning(module, w, d.loc);
						this.warnings.push(warning);
					});
				}
			});
			this.reportDependencyWarnings(module, block.blocks);
		});
	}

	addChunk(name, module, loc) {
		let chunk;
		if(name) {
			if(Object.prototype.hasOwnProperty.call(this.namedChunks, name)) {
				chunk = this.namedChunks[name];
				if(module) {
					chunk.addOrigin(module, loc);
				}
				return chunk;
			}
		}
		chunk = new Chunk(name, module, loc);
		this.chunks.push(chunk);
		if(name) {
			this.namedChunks[name] = chunk;
		}
		return chunk;
	}

	assignIndex(module) {
		const self = this;

		function assignIndexToModule(module) {
			// enter module
			if(typeof module.index !== "number") {
				module.index = self.nextFreeModuleIndex++;
				queue.push(function() {
					// leave module
					module.index2 = self.nextFreeModuleIndex2++;
				});
				// enter it as block
				assignIndexToDependencyBlock(module);
			}
		}

		function assignIndexToDependency(dependency) {
			if(dependency.module) {
				queue.push(function() {
					assignIndexToModule(dependency.module);
				});
			}
		}

		function assignIndexToDependencyBlock(block) {
			const allDependencies = [];

			function iteratorDependency(d) {
				allDependencies.push(d);
			}

			function iteratorBlock(b) {
				queue.push(function() {
					assignIndexToDependencyBlock(b);
				});
			}

			if(block.variables) {
				block.variables.forEach(function(v) {
					v.dependencies.forEach(iteratorDependency);
				});
			}
			if(block.dependencies) {
				block.dependencies.forEach(iteratorDependency);
			}
			if(block.blocks) {
				block.blocks.slice().reverse().forEach(iteratorBlock, this);
			}
			allDependencies.reverse();
			allDependencies.forEach(function(d) {
				queue.push(function() {
					assignIndexToDependency(d);
				});
			});
		}

		const queue = [
			function() {
				assignIndexToModule(module);
			}
		];
		while(queue.length) {
			queue.pop()();
		}
	}

	assignDepth(module) {
		function assignDepthToModule(module, depth) {
			// enter module
			if(typeof module.depth === "number" && module.depth <= depth) {
				return;
			}
			module.depth = depth;
			// enter it as block
			assignDepthToDependencyBlock(module, depth + 1);
		}

		function assignDepthToDependency(dependency, depth) {
			if(dependency.module) {
				queue.push(function() {
					assignDepthToModule(dependency.module, depth);
				});
			}
		}

		function assignDepthToDependencyBlock(block, depth) {
			function iteratorDependency(d) {
				assignDepthToDependency(d, depth);
			}

			function iteratorBlock(b) {
				assignDepthToDependencyBlock(b, depth);
			}

			if(block.variables) {
				block.variables.forEach(function(v) {
					v.dependencies.forEach(iteratorDependency);
				});
			}
			if(block.dependencies) {
				block.dependencies.forEach(iteratorDependency);
			}
			if(block.blocks) {
				block.blocks.forEach(iteratorBlock);
			}
		}

		const queue = [
			function() {
				assignDepthToModule(module, 0);
			}
		];
		while(queue.length) {
			queue.pop()();
		}
	}

	processDependenciesBlockForChunk(block, chunk) {
		const queue = [
			[block, chunk]
		];
		while(queue.length) {
			const queueItem = queue.pop();
			block = queueItem[0];
			chunk = queueItem[1];
			if(block.variables) {
				block.variables.forEach(function(v) {
					v.dependencies.forEach(iteratorDependency, this);
				}, this);
			}
			if(block.dependencies) {
				block.dependencies.forEach(iteratorDependency, this);
			}
			if(block.blocks) {
				block.blocks.forEach(iteratorBlock, this);
			}
		}
		function iteratorBlock(b) {
			let c;
			if(!b.chunks) {
				c = this.addChunk(b.chunkName, b.module, b.loc);
				b.chunks = [c];
				c.addBlock(b);
			} else {
				c = b.chunks[0];
			}
			chunk.addChunk(c);
			c.addParent(chunk);
			queue.push([b, c]);
		}

		function iteratorDependency(d) {
			if(!d.module) {
				return;
			}
			if(d.weak) {
				return;
			}
			if(chunk.addModule(d.module)) {
				d.module.addChunk(chunk);
				queue.push([d.module, chunk]);
			}
		}
	}

	removeChunkFromDependencies(block, chunk) {
		block.blocks.forEach(function(b) {
			b.chunks.forEach(function(c) {
				chunk.removeChunk(c);
				c.removeParent(chunk);
				this.removeChunkFromDependencies(b, c);
			}, this);
		}, this);
		function iteratorDependency(d) {
			if(!d.module) {
				return;
			}
			if(!d.module.hasReasonForChunk(chunk)) {
				if(d.module.removeChunk(chunk)) {
					this.removeChunkFromDependencies(d.module, chunk);
				}
			}
		}

		block.dependencies.forEach(iteratorDependency, this);
		block.variables.forEach(function(v) {
			v.dependencies.forEach(iteratorDependency, this);
		}, this);
	}

	applyModuleIds() {
		const unusedIds = [];
		let nextFreeModuleId = 0;
		const usedIds = [];
		const usedIdMap = {};
		if(this.usedModuleIds) {
			Object.keys(this.usedModuleIds).forEach(function(key) {
				const id = this.usedModuleIds[key];
				if(typeof usedIdMap[id] === "undefined") {
					usedIds.push(id);
					usedIdMap[id] = id;
				}
			}, this);
		}
		this.modules.forEach(module => {
			if(module.id !== null && typeof usedIdMap[module.id] === "undefined") {
				usedIds.push(module.id);
				usedIdMap[module.id] = module.id;
			}
		});
		if(usedIds.length > 0) {
			const usedNumberIds = usedIds.filter(id => typeof id === "number");
			nextFreeModuleId = usedNumberIds.reduce((a, b) => Math.max(a, b), -1) + 1;
			for(let i = 0; i < nextFreeModuleId; i++) {
				if(usedIdMap[i] !== i) {
					unusedIds.push(i);
				}
			}
			unusedIds.reverse();
		}
		this.modules.forEach(module => {
			if(module.id === null) {
				if(unusedIds.length > 0) {
					module.id = unusedIds.pop();
				} else {
					module.id = nextFreeModuleId++;
				}
			}
		}, this);
	}

	applyChunkIds() {
		const unusedIds = [];
		let nextFreeChunkId = 0;
		if(this.usedChunkIds) {
			const usedIds = Object.keys(this.usedChunkIds).map(function(key) {
				return this.usedChunkIds[key];
			}, this).sort();
			const usedNumberIds = usedIds.filter(id => typeof id === "number");
			nextFreeChunkId = usedNumberIds.reduce((a, b) => Math.max(a, b), -1) + 1;
			for(let i = 0; i < nextFreeChunkId; i++) {
				if(this.usedChunkIds[i] !== i) {
					unusedIds.push(i);
				}
			}
			unusedIds.reverse();
		}
		this.chunks.forEach(chunk => {
			if(chunk.id === null) {
				if(unusedIds.length > 0) {
					chunk.id = unusedIds.pop();
				} else {
					chunk.id = nextFreeChunkId++;
				}
			}
			if(!chunk.ids) {
				chunk.ids = [chunk.id];
			}
		}, this);
	}

	sortItemsBeforeIds() {
	}

	sortItemsWithModuleIds() {
		this.modules.sort(byId);
		this.modules.forEach(module => {
			module.sortItems();
		});
		this.chunks.forEach(chunk => {
			chunk.sortItems();
		});
	}

	sortItemsWithChunkIds() {
		this.chunks.sort(byId);
		this.modules.forEach(module => {
			module.sortItems();
		});
		this.chunks.forEach(function(chunk) {
			chunk.sortItems();
		});
	}

	summarizeDependencies() {
		function filterDups(array) {
			const newArray = [];
			for(let i = 0; i < array.length; i++) {
				if(i === 0 || array[i - 1] !== array[i]) {
					newArray.push(array[i]);
				}
			}
			return newArray;
		}

		this.fileDependencies = (this.compilationDependencies || []).slice();
		this.contextDependencies = [];
		this.missingDependencies = [];
		this.children.forEach(child => {
			this.fileDependencies = this.fileDependencies.concat(child.fileDependencies);
			this.contextDependencies = this.contextDependencies.concat(child.contextDependencies);
			this.missingDependencies = this.missingDependencies.concat(child.missingDependencies);
		});
		this.modules.forEach(function(module) {
			if(module.fileDependencies) {
				module.fileDependencies.forEach(function(item) {
					this.fileDependencies.push(item);
				}, this);
			}
			if(module.contextDependencies) {
				module.contextDependencies.forEach(function(item) {
					this.contextDependencies.push(item);
				}, this);
			}
		}, this);
		this.errors.forEach(function(error) {
			if(Array.isArray(error.missing)) {
				error.missing.forEach(function(item) {
					this.missingDependencies.push(item);
				}, this);
			}
		}, this);
		this.fileDependencies.sort();
		this.fileDependencies = filterDups(this.fileDependencies);
		this.contextDependencies.sort();
		this.contextDependencies = filterDups(this.contextDependencies);
		this.missingDependencies.sort();
		this.missingDependencies = filterDups(this.missingDependencies);
	}

	createHash() {
		const outputOptions = this.outputOptions;
		const hashFunction = outputOptions.hashFunction;
		const hashDigest = outputOptions.hashDigest;
		const hashDigestLength = outputOptions.hashDigestLength;
		const hash = crypto.createHash(hashFunction);
		if(outputOptions.hashSalt) {
			hash.update(outputOptions.hashSalt);
		}
		this.mainTemplate.updateHash(hash);
		this.chunkTemplate.updateHash(hash);
		this.moduleTemplate.updateHash(hash);
		let i;
		let chunk;
		const chunks = this.chunks.slice();
		chunks.sort((a, b) => {
			const aEntry = a.hasRuntime();
			const bEntry = b.hasRuntime();
			if(aEntry && !bEntry) {
				return 1;
			}
			if(!aEntry && bEntry) {
				return -1;
			}
			return 0;
		});
		for(i = 0; i < chunks.length; i++) {
			chunk = chunks[i];
			const chunkHash = crypto.createHash(hashFunction);
			if(outputOptions.hashSalt) {
				hash.update(outputOptions.hashSalt);
			}
			chunk.updateHash(chunkHash);
			if(chunk.hasRuntime()) {
				this.mainTemplate.updateHashForChunk(chunkHash, chunk);
			} else {
				this.chunkTemplate.updateHashForChunk(chunkHash);
			}
			this.applyPlugins2("chunk-hash", chunk, chunkHash);
			chunk.hash = chunkHash.digest(hashDigest);
			hash.update(chunk.hash);
			chunk.renderedHash = chunk.hash.substr(0, hashDigestLength);
		}
		this.fullHash = hash.digest(hashDigest);
		this.hash = this.fullHash.substr(0, hashDigestLength);
	}

	modifyHash(update) {
		const outputOptions = this.outputOptions;
		const hashFunction = outputOptions.hashFunction;
		const hashDigest = outputOptions.hashDigest;
		const hashDigestLength = outputOptions.hashDigestLength;
		const hash = crypto.createHash(hashFunction);
		hash.update(this.fullHash);
		hash.update(update);
		this.fullHash = hash.digest(hashDigest);
		this.hash = this.fullHash.substr(0, hashDigestLength);
	}

	createModuleAssets() {
		for(let i = 0; i < this.modules.length; i++) {
			const module = this.modules[i];
			if(module.assets) {
				Object.keys(module.assets)
					.forEach(name => {
						const file = this.getPath(name);
						this.assets[file] = module.assets[name];
						this.applyPlugins2("module-asset", module, file);
					});
			}
		}
	}

	createChunkAssets() {
		const outputOptions = this.outputOptions;
		const filename = outputOptions.filename;
		const chunkFilename = outputOptions.chunkFilename;
		for(let i = 0; i < this.chunks.length; i++) {
			const chunk = this.chunks[i];
			chunk.files = [];
			const chunkHash = chunk.hash;
			let source;
			let file;
			const filenameTemplate = chunk.filenameTemplate
				? chunk.filenameTemplate
				: chunk.isInitial() ? filename : chunkFilename;
			try {
				const useChunkHash = !chunk.hasRuntime() || this.mainTemplate.useChunkHash && this.mainTemplate.useChunkHash(chunk);
				const usedHash = useChunkHash ? chunkHash : this.fullHash;
				if(this.cache && this.cache[`c${chunk.id}`] && this.cache[`c${chunk.id}`].hash === usedHash) {
					source = this.cache[`c${chunk.id}`].source;
				} else {
					if(chunk.hasRuntime()) {
						source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
					} else {
						source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
					}
					if(this.cache) {
						this.cache[`c${chunk.id}`] = {
							hash: usedHash,
							source: source = source instanceof webpackSources.CachedSource ? source : new webpackSources.CachedSource(source)
						};
					}
				}
				file = this.getPath(filenameTemplate, {
					noChunkHash: !useChunkHash,
					chunk
				});
				if(this.assets[file]) {
					throw new Error(`Conflict: Multiple assets emit to the same filename '${file}'`);
				}
				this.assets[file] = source;
				chunk.files.push(file);
				this.applyPlugins2("chunk-asset", chunk, file);
			} catch(err) {
				this.errors.push(new ChunkRenderError(chunk, file || filenameTemplate, err));
			}
		}
	}

	getPath(filename, data) {
		data = data || {}
		data.hash = data.hash || this.hash;
		return this.mainTemplate.applyPluginsWaterfall("asset-path", filename, data);
	}

	getStats() {
		return new Stats(this);
	}

	createChildCompiler(name, outputOptions) {
		return this.compiler.createChildCompiler(this, name, outputOptions);
	}

	checkConstraints() {
		const usedIds = {};
		this.modules.forEach(module => {
			if(usedIds[module.id]) {
				throw new Error(`checkConstraints: duplicate module id ${module.id}`);
			}
		});
		this.chunks.forEach((chunk, idx) => {
			if(this.chunks.indexOf(chunk) !== idx) {
				throw new Error(`checkConstraints: duplicate chunk in compilation ${chunk.debugId}`);
			}
			chunk.checkConstraints();
		});
	}
}
function byId(a, b) {
	if(a.id < b.id) {
		return -1;
	}
	if(a.id > b.id) {
		return 1;
	}
	return 0;
}
module.exports = Compilation;
