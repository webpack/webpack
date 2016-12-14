/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

var Tapable = require("tapable");
var EntryModuleNotFoundError = require("./EntryModuleNotFoundError");
var ModuleNotFoundError = require("./ModuleNotFoundError");
var ModuleDependencyWarning = require("./ModuleDependencyWarning");
var Module = require("./Module");
var ArrayMap = require("./ArrayMap");
var Chunk = require("./Chunk");
var Entrypoint = require("./Entrypoint");
var Stats = require("./Stats");
var MainTemplate = require("./MainTemplate");
var ChunkTemplate = require("./ChunkTemplate");
var HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");
var ModuleTemplate = require("./ModuleTemplate");
var Dependency = require("./Dependency");
var ChunkRenderError = require("./ChunkRenderError");
var CachedSource = require("webpack-sources").CachedSource;

function Compilation(compiler) {
	Tapable.call(this);
	this.compiler = compiler;
	this.resolvers = compiler.resolvers;
	this.inputFileSystem = compiler.inputFileSystem;

	var options = this.options = compiler.options;
	this.outputOptions = options && options.output;
	this.bail = options && options.bail;
	this.profile = options && options.profile;
	this.performance = options && options.performance;

	this.mainTemplate = new MainTemplate(this.outputOptions);
	this.chunkTemplate = new ChunkTemplate(this.outputOptions, this.mainTemplate);
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
	this.dependencyFactories = new ArrayMap();
	this.dependencyTemplates = new ArrayMap();
}
module.exports = Compilation;

Compilation.prototype = Object.create(Tapable.prototype);
Compilation.prototype.constructor = Compilation;

Compilation.prototype.templatesPlugin = function(name, fn) {
	this.mainTemplate.plugin(name, fn);
	this.chunkTemplate.plugin(name, fn);
};

Compilation.prototype.addModule = function(module, cacheGroup) {
	cacheGroup = cacheGroup || "m";
	var identifier = module.identifier();
	if(this._modules[identifier]) {
		return false;
	}
	if(this.cache && this.cache[cacheGroup + identifier]) {
		var cacheModule = this.cache[cacheGroup + identifier];

		var rebuild = true;
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
};

Compilation.prototype.getModule = function(module) {
	var identifier = module.identifier();
	return this._modules[identifier];
};

Compilation.prototype.findModule = function(identifier) {
	return this._modules[identifier];
};

Compilation.prototype.buildModule = function(module, optional, origin, dependencies, thisCallback) {
	var _this = this;
	_this.applyPlugins1("build-module", module);
	if(module.building) return module.building.push(thisCallback);
	var building = module.building = [thisCallback];

	function callback(err) {
		module.building = undefined;
		building.forEach(function(cb) {
			cb(err);
		});
	}
	module.build(_this.options, this, _this.resolvers.normal, _this.inputFileSystem, function(err) {
		module.errors.forEach(function(err) {
			err.origin = origin;
			err.dependencies = dependencies;
			if(optional)
				_this.warnings.push(err);
			else
				_this.errors.push(err);
		}, this);
		module.warnings.forEach(function(err) {
			err.origin = origin;
			err.dependencies = dependencies;
			_this.warnings.push(err);
		}, this);
		module.dependencies.sort(Dependency.compare);
		if(err) {
			_this.applyPlugins2("failed-module", module, err);
			return callback(err);
		}
		_this.applyPlugins1("succeed-module", module);
		return callback();
	});
};

Compilation.prototype.processModuleDependencies = function(module, callback) {
	var dependencies = [];

	function addDependency(dep) {
		for(var i = 0; i < dependencies.length; i++) {
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
			block.variables.forEach(function(v) {
				v.dependencies.forEach(addDependency);
			});
		}
	}
	addDependenciesBlock(module);
	this.addModuleDependencies(module, dependencies, this.bail, null, true, callback);
};

Compilation.prototype.addModuleDependencies = function(module, dependencies, bail, cacheGroup, recursive, callback) {
	var _this = this;
	var start = _this.profile && +new Date();

	var factories = [];
	for(var i = 0; i < dependencies.length; i++) {
		var factory = _this.dependencyFactories.get(dependencies[i][0].constructor);
		if(!factory) {
			return callback(new Error("No module factory available for dependency type: " + dependencies[i][0].constructor.name));
		}
		factories[i] = [factory, dependencies[i]];
	}
	async.forEach(factories, function iteratorFactory(item, callback) {
		var dependencies = item[1];

		var errorAndCallback = function errorAndCallback(err) {
			err.origin = module;
			_this.errors.push(err);
			if(bail) {
				callback(err);
			} else {
				callback();
			}
		};
		var warningAndCallback = function warningAndCallback(err) {
			err.origin = module;
			_this.warnings.push(err);
			callback();
		};

		var factory = item[0];
		factory.create({
			contextInfo: {
				issuer: module.nameForCondition && module.nameForCondition()
			},
			context: module.context,
			dependencies: dependencies
		}, function factoryCallback(err, dependentModule) {
			function isOptional() {
				return dependencies.filter(function(d) {
					return !d.optional;
				}).length === 0;
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
			if(_this.profile) {
				if(!dependentModule.profile) {
					dependentModule.profile = {};
				}
				var afterFactory = +new Date();
				dependentModule.profile.factory = afterFactory - start;
			}

			dependentModule.issuer = module;
			var newModule = _this.addModule(dependentModule, cacheGroup);

			if(!newModule) { // from cache
				dependentModule = _this.getModule(dependentModule);

				if(dependentModule.optional) {
					dependentModule.optional = isOptional();
				}

				dependencies.forEach(function(dep) {
					dep.module = dependentModule;
					dependentModule.addReason(module, dep);
				});

				if(_this.profile) {
					if(!module.profile) {
						module.profile = {};
					}
					var time = +new Date() - start;
					if(!module.profile.dependencies || time > module.profile.dependencies) {
						module.profile.dependencies = time;
					}
				}

				return process.nextTick(callback);
			}

			if(newModule instanceof Module) {
				if(_this.profile) {
					newModule.profile = dependentModule.profile;
				}

				newModule.optional = isOptional();
				newModule.issuer = dependentModule.issuer;
				dependentModule = newModule;

				dependencies.forEach(function(dep) {
					dep.module = dependentModule;
					dependentModule.addReason(module, dep);
				});

				if(_this.profile) {
					var afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}

				if(recursive) {
					return process.nextTick(_this.processModuleDependencies.bind(_this, dependentModule, callback));
				} else {
					return process.nextTick(callback);
				}
			}

			dependentModule.optional = isOptional();

			dependencies.forEach(function(dep) {
				dep.module = dependentModule;
				dependentModule.addReason(module, dep);
			});

			_this.buildModule(dependentModule, isOptional(), module, dependencies, function(err) {
				if(err) {
					return errorOrWarningAndCallback(err);
				}

				if(_this.profile) {
					var afterBuilding = +new Date();
					dependentModule.profile.building = afterBuilding - afterFactory;
				}

				if(recursive) {
					_this.processModuleDependencies(dependentModule, callback);
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
		_this = null;

		if(err) {
			return callback(err);
		}

		return process.nextTick(callback);
	});
};

Compilation.prototype._addModuleChain = function process(context, dependency, onModule, callback) {
	var start = this.profile && +new Date();

	var errorAndCallback = this.bail ? function errorAndCallback(err) {
		callback(err);
	} : function errorAndCallback(err) {
		err.dependencies = [dependency];
		this.errors.push(err);
		callback();
	}.bind(this);

	if(typeof dependency !== "object" || dependency === null || !dependency.constructor) {
		throw new Error("Parameter 'dependency' must be a Dependency");
	}

	var moduleFactory = this.dependencyFactories.get(dependency.constructor);
	if(!moduleFactory) {
		throw new Error("No dependency factory available for this dependency type: " + dependency.constructor.name);
	}

	moduleFactory.create({
		context: context,
		dependencies: [dependency]
	}, function(err, module) {
		if(err) {
			return errorAndCallback(new EntryModuleNotFoundError(err));
		}

		if(this.profile) {
			if(!module.profile) {
				module.profile = {};
			}
			var afterFactory = +new Date();
			module.profile.factory = afterFactory - start;
		}

		var result = this.addModule(module);
		if(!result) {
			module = this.getModule(module);

			onModule(module);

			if(this.profile) {
				var afterBuilding = +new Date();
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

		this.buildModule(module, false, null, null, function(err) {
			if(err) {
				return errorAndCallback(err);
			}

			if(this.profile) {
				var afterBuilding = +new Date();
				module.profile.building = afterBuilding - afterFactory;
			}

			moduleReady.call(this);
		}.bind(this));

		function moduleReady() {
			this.processModuleDependencies(module, function(err) {
				if(err) {
					return callback(err);
				}

				return callback(null, module);
			});
		}
	}.bind(this));
};

Compilation.prototype.addEntry = function process(context, entry, name, callback) {
	var slot = {
		name: name,
		module: null
	};
	this.preparedChunks.push(slot);
	this._addModuleChain(context, entry, function(module) {

		entry.module = module;
		this.entries.push(module);
		module.issuer = null;

	}.bind(this), function(err, module) {
		if(err) {
			return callback(err);
		}

		if(module) {
			slot.module = module;
		} else {
			var idx = this.preparedChunks.indexOf(slot);
			this.preparedChunks.splice(idx, 1);
		}
		return callback();
	}.bind(this));
};

Compilation.prototype.prefetch = function process(context, dependency, callback) {
	this._addModuleChain(context, dependency, function(module) {

		module.prefetched = true;
		module.issuer = null;

	}, callback);
};

Compilation.prototype.rebuildModule = function(module, thisCallback) {
	if(module.variables.length || module.blocks.length)
		throw new Error("Cannot rebuild a complex module with variables or blocks");
	if(module.rebuilding) {
		return module.rebuilding.push(thisCallback);
	}
	var rebuilding = module.rebuilding = [thisCallback];

	function callback(err) {
		module.rebuilding = undefined;
		rebuilding.forEach(function(cb) {
			cb(err);
		});
	}
	var deps = module.dependencies.slice();
	this.buildModule(module, false, module, null, function(err) {
		if(err) return callback(err);

		this.processModuleDependencies(module, function(err) {
			if(err) return callback(err);
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
			callback();
		}.bind(this));

	}.bind(this));
};

Compilation.prototype.finish = function finish() {
	this.applyPlugins1("finish-modules", this.modules);
	this.modules.forEach(function(m) {
		this.reportDependencyWarnings(m, [m]);
	}, this);
};

Compilation.prototype.unseal = function unseal() {
	this.applyPlugins0("unseal");
	this.chunks.length = 0;
	this.namedChunks = {};
	this.additionalChunkAssets.length = 0;
	this.assets = {};
	this.modules.forEach(function(module) {
		module.unseal();
	});
};

Compilation.prototype.seal = function seal(callback) {
	var self = this;
	self.applyPlugins0("seal");
	self.nextFreeModuleIndex = 0;
	self.nextFreeModuleIndex2 = 0;
	self.preparedChunks.forEach(function(preparedChunk) {
		var module = preparedChunk.module;
		var chunk = self.addChunk(preparedChunk.name, module);
		var entrypoint = self.entrypoints[chunk.name] = new Entrypoint(chunk.name);
		entrypoint.unshiftChunk(chunk);

		chunk.addModule(module);
		module.addChunk(chunk);
		chunk.entryModule = module;
		self.assignIndex(module);
		self.processDependenciesBlockForChunk(module, chunk);
	}, self);
	self.sortModules(self.modules);
	self.applyPlugins0("optimize");

	while(self.applyPluginsBailResult1("optimize-modules-basic", self.modules) ||
		self.applyPluginsBailResult1("optimize-modules", self.modules) ||
		self.applyPluginsBailResult1("optimize-modules-advanced", self.modules)); // eslint-disable-line no-extra-semi
	self.applyPlugins1("after-optimize-modules", self.modules);

	while(self.applyPluginsBailResult1("optimize-chunks-basic", self.chunks) ||
		self.applyPluginsBailResult1("optimize-chunks", self.chunks) ||
		self.applyPluginsBailResult1("optimize-chunks-advanced", self.chunks)); // eslint-disable-line no-extra-semi
	self.applyPlugins1("after-optimize-chunks", self.chunks);

	self.applyPluginsAsyncSeries("optimize-tree", self.chunks, self.modules, function sealPart2(err) {
		if(err) {
			return callback(err);
		}

		self.applyPlugins2("after-optimize-tree", self.chunks, self.modules);

		var shouldRecord = self.applyPluginsBailResult("should-record") !== false;

		self.sortItemsBeforeIds();

		self.applyPlugins2("revive-modules", self.modules, self.records);
		self.applyPlugins1("optimize-module-order", self.modules);
		self.applyPlugins1("advanced-optimize-module-order", self.modules);
		self.applyPlugins1("before-module-ids", self.modules);
		self.applyPlugins1("module-ids", self.modules);
		self.applyModuleIds();
		self.applyPlugins1("optimize-module-ids", self.modules);
		self.applyPlugins1("after-optimize-module-ids", self.modules);

		self.sortItemsWithModuleIds();

		self.applyPlugins2("revive-chunks", self.chunks, self.records);
		self.applyPlugins1("optimize-chunk-order", self.chunks);
		self.applyPlugins1("before-chunk-ids", self.chunks);
		self.applyChunkIds();
		self.applyPlugins1("optimize-chunk-ids", self.chunks);
		self.applyPlugins1("after-optimize-chunk-ids", self.chunks);

		self.sortItemsWithChunkIds();

		if(shouldRecord)
			self.applyPlugins2("record-modules", self.modules, self.records);
		if(shouldRecord)
			self.applyPlugins2("record-chunks", self.chunks, self.records);

		self.applyPlugins0("before-hash");
		self.createHash();
		self.applyPlugins0("after-hash");

		if(shouldRecord)
			self.applyPlugins1("record-hash", self.records);

		self.applyPlugins0("before-module-assets");
		self.createModuleAssets();
		if(self.applyPluginsBailResult("should-generate-chunk-assets") !== false) {
			self.applyPlugins0("before-chunk-assets");
			self.createChunkAssets();
		}
		self.applyPlugins1("additional-chunk-assets", self.chunks);
		self.summarizeDependencies();
		if(shouldRecord)
			self.applyPlugins2("record", self, self.records);

		self.applyPluginsAsync("additional-assets", function(err) {
			if(err) {
				return callback(err);
			}
			self.applyPluginsAsync("optimize-chunk-assets", self.chunks, function(err) {
				if(err) {
					return callback(err);
				}
				self.applyPlugins1("after-optimize-chunk-assets", self.chunks);
				self.applyPluginsAsync("optimize-assets", self.assets, function(err) {
					if(err) {
						return callback(err);
					}
					self.applyPlugins1("after-optimize-assets", self.assets);
					if(self.applyPluginsBailResult("need-additional-seal")) {
						self.unseal();
						return self.seal(callback);
					}
					return self.applyPluginsAsync("after-seal", callback);
				});
			});
		});
	});
};

Compilation.prototype.sortModules = function sortModules(modules) {
	modules.sort(function(a, b) {
		if(a.index < b.index) return -1;
		if(a.index > b.index) return 1;
		return 0;
	});
};

Compilation.prototype.reportDependencyWarnings = function reportDependencyWarnings(module, blocks) {
	var _this = this;
	blocks.forEach(function(block) {
		block.dependencies.forEach(function(d) {
			var warnings = d.getWarnings();
			if(warnings) {
				warnings.forEach(function(w) {
					var warning = new ModuleDependencyWarning(module, w, d.loc);
					_this.warnings.push(warning);
				});
			}
		});
		_this.reportDependencyWarnings(module, block.blocks);
	});
};

Compilation.prototype.addChunk = function addChunk(name, module, loc) {
	var chunk;
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
};

Compilation.prototype.assignIndex = function assignIndex(module) {
	var _this = this;

	function assignIndexToModule(module) {
		// enter module
		if(typeof module.index !== "number") {
			module.index = _this.nextFreeModuleIndex++;

			queue.push(function() {
				// leave module
				module.index2 = _this.nextFreeModuleIndex2++;
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
		var allDependencies = [];

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

	var queue = [function() {
		assignIndexToModule(module);
	}];
	while(queue.length) {
		queue.pop()();
	}
};

Compilation.prototype.processDependenciesBlockForChunk = function processDependenciesBlockForChunk(block, chunk) {
	var queue = [
		[block, chunk]
	];
	while(queue.length) {
		var queueItem = queue.pop();
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
		var c;
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
};

Compilation.prototype.removeChunkFromDependencies = function removeChunkFromDependencies(block, chunk) {
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

};

Compilation.prototype.applyModuleIds = function applyModuleIds() {
	var unusedIds = [];
	var nextFreeModuleId = 0;
	var usedIds = [];
	var usedIdMap = {};
	if(this.usedModuleIds) {
		Object.keys(this.usedModuleIds).forEach(function(key) {
			var id = this.usedModuleIds[key];
			if(typeof usedIdMap[id] === "undefined") {
				usedIds.push(id);
				usedIdMap[id] = id;
			}
		}, this);
	}
	this.modules.forEach(function(module) {
		if(module.id !== null && typeof usedIdMap[module.id] === "undefined") {
			usedIds.push(module.id);
			usedIdMap[module.id] = module.id;
		}
	});
	if(usedIds.length > 0) {
		var usedNumberIds = usedIds.filter(function(id) {
			return typeof id === "number";
		});
		nextFreeModuleId = usedNumberIds.reduce(function(a, b) {
			return Math.max(a, b);
		}, -1) + 1;
		for(var i = 0; i < nextFreeModuleId; i++) {
			if(usedIdMap[i] !== i)
				unusedIds.push(i);
		}
		unusedIds.reverse();
	}
	this.modules.forEach(function(module) {
		if(module.id === null) {
			if(unusedIds.length > 0)
				module.id = unusedIds.pop();
			else
				module.id = nextFreeModuleId++;
		}
	}, this);
};

Compilation.prototype.applyChunkIds = function applyChunkIds() {
	var unusedIds = [];
	var nextFreeChunkId = 0;
	if(this.usedChunkIds) {
		var usedIds = Object.keys(this.usedChunkIds).map(function(key) {
			return this.usedChunkIds[key];
		}, this).sort();
		var usedNumberIds = usedIds.filter(function(id) {
			return typeof id === "number";
		});
		nextFreeChunkId = usedNumberIds.reduce(function(a, b) {
			return Math.max(a, b);
		}, -1) + 1;
		for(var i = 0; i < nextFreeChunkId; i++) {
			if(this.usedChunkIds[i] !== i)
				unusedIds.push(i);
		}
		unusedIds.reverse();
	}
	this.chunks.forEach(function(chunk) {
		if(chunk.id === null) {
			if(unusedIds.length > 0)
				chunk.id = unusedIds.pop();
			else
				chunk.id = nextFreeChunkId++;
		}
		if(!chunk.ids) {
			chunk.ids = [chunk.id];
		}
	}, this);
};

function byId(a, b) {
	if(a.id < b.id) return -1;
	if(a.id > b.id) return 1;
	return 0;
}

Compilation.prototype.sortItemsBeforeIds = function sortItemsBeforeIds() {

};

Compilation.prototype.sortItemsWithModuleIds = function sortItemsWithModuleIds() {
	this.modules.sort(byId);
	this.modules.forEach(function(module) {
		module.sortItems();
	});
	this.chunks.forEach(function(chunk) {
		chunk.sortItems();
	});
};

Compilation.prototype.sortItemsWithChunkIds = function sortItemsWithChunkIds() {
	this.chunks.sort(byId);
	this.modules.forEach(function(module) {
		module.sortItems();
	});
	this.chunks.forEach(function(chunk) {
		chunk.sortItems();
	});
};

Compilation.prototype.summarizeDependencies = function summarizeDependencies() {
	function filterDups(array) {
		var newArray = [];
		for(var i = 0; i < array.length; i++) {
			if(i === 0 || array[i - 1] !== array[i])
				newArray.push(array[i]);
		}
		return newArray;
	}
	this.fileDependencies = (this.compilationDependencies || []).slice();
	this.contextDependencies = [];
	this.missingDependencies = [];
	this.children.forEach(function(child) {
		this.fileDependencies = this.fileDependencies.concat(child.fileDependencies);
		this.contextDependencies = this.contextDependencies.concat(child.contextDependencies);
		this.missingDependencies = this.missingDependencies.concat(child.missingDependencies);
	}.bind(this));
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
};

Compilation.prototype.createHash = function createHash() {
	var outputOptions = this.outputOptions;
	var hashFunction = outputOptions.hashFunction;
	var hashDigest = outputOptions.hashDigest;
	var hashDigestLength = outputOptions.hashDigestLength;
	var hash = require("crypto").createHash(hashFunction);
	if(outputOptions.hashSalt)
		hash.update(outputOptions.hashSalt);
	this.mainTemplate.updateHash(hash);
	this.chunkTemplate.updateHash(hash);
	this.moduleTemplate.updateHash(hash);
	var i, chunk;
	var chunks = this.chunks.slice();
	chunks.sort(function(a, b) {
		var aEntry = a.hasRuntime();
		var bEntry = b.hasRuntime();
		if(aEntry && !bEntry) return 1;
		if(!aEntry && bEntry) return -1;
		return 0;
	});
	for(i = 0; i < chunks.length; i++) {
		chunk = chunks[i];
		var chunkHash = require("crypto").createHash(hashFunction);
		if(outputOptions.hashSalt)
			hash.update(outputOptions.hashSalt);
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
};

Compilation.prototype.modifyHash = function modifyHash(update) {
	var outputOptions = this.outputOptions;
	var hashFunction = outputOptions.hashFunction;
	var hashDigest = outputOptions.hashDigest;
	var hashDigestLength = outputOptions.hashDigestLength;
	var hash = require("crypto").createHash(hashFunction);
	hash.update(this.fullHash);
	hash.update(update);
	this.fullHash = hash.digest(hashDigest);
	this.hash = this.fullHash.substr(0, hashDigestLength);
};

Compilation.prototype.createModuleAssets = function createModuleAssets() {
	var cacheAssetsAndApplyPlugins = function cacheAssetsAndApplyPlugins(name) {
		var file = this.getPath(name);
		this.assets[file] = module.assets[name];
		this.applyPlugins2("module-asset", module, file);
	}

	for(var i = 0; i < this.modules.length; i++) {
		var module = this.modules[i];
		if(module.assets) {
			Object.keys(module.assets).forEach(cacheAssetsAndApplyPlugins, this);
		}
	}
};

Compilation.prototype.createChunkAssets = function createChunkAssets() {
	var outputOptions = this.outputOptions;
	var filename = outputOptions.filename;
	var chunkFilename = outputOptions.chunkFilename;
	for(var i = 0; i < this.chunks.length; i++) {
		var chunk = this.chunks[i];
		chunk.files = [];
		var chunkHash = chunk.hash;
		var source;
		var file;
		var filenameTemplate = chunk.filenameTemplate ? chunk.filenameTemplate :
			chunk.isInitial() ? filename :
			chunkFilename;
		try {
			var useChunkHash = !chunk.hasRuntime() || (this.mainTemplate.useChunkHash && this.mainTemplate.useChunkHash(chunk));
			var usedHash = useChunkHash ? chunkHash : this.fullHash;
			if(this.cache && this.cache["c" + chunk.id] && this.cache["c" + chunk.id].hash === usedHash) {
				source = this.cache["c" + chunk.id].source;
			} else {
				if(chunk.hasRuntime()) {
					source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
				} else {
					source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
				}
				if(this.cache) {
					this.cache["c" + chunk.id] = {
						hash: usedHash,
						source: source = (source instanceof CachedSource ? source : new CachedSource(source))
					};
				}
			}
			file = this.getPath(filenameTemplate, {
				noChunkHash: !useChunkHash,
				chunk: chunk
			});
			if(this.assets[file])
				throw new Error("Conflict: Multiple assets emit to the same filename '" + file + "'");
			this.assets[file] = source;
			chunk.files.push(file);
			this.applyPlugins2("chunk-asset", chunk, file);
		} catch(err) {
			this.errors.push(new ChunkRenderError(chunk, file || filenameTemplate, err));
		}
	}
};

Compilation.prototype.getPath = function(filename, data) {
	data = data || {};
	data.hash = data.hash || this.hash;
	return this.mainTemplate.applyPluginsWaterfall("asset-path", filename, data);
};

Compilation.prototype.getStats = function() {
	return new Stats(this);
};

Compilation.prototype.createChildCompiler = function(name, outputOptions) {
	return this.compiler.createChildCompiler(this, name, outputOptions);
};

Compilation.prototype.checkConstraints = function() {
	var usedIds = {};
	this.modules.forEach(function(module) {
		if(usedIds[module.id])
			throw new Error("checkConstraints: duplicate module id " + module.id);
	});
	this.chunks.forEach(function(chunk, idx) {
		if(this.chunks.indexOf(chunk) !== idx)
			throw new Error("checkConstraints: duplicate chunk in compilation " + chunk.debugId);
		chunk.checkConstraints();
	}.bind(this));
};
