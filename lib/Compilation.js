/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

var Tapable = require("tapable");
var Parser = require("./Parser");
var Dependency = require("./Dependency");
var EntryModuleNotFoundError = require("./EntryModuleNotFoundError");
var ModuleNotFoundError = require("./ModuleNotFoundError");
var CriticalDependenciesWarning = require("./CriticalDependenciesWarning");
var Module = require("./Module");
var ArrayMap = require("./ArrayMap");
var Chunk = require("./Chunk");
var Stats = require("./Stats");
var MainTemplate = require("./MainTemplate");
var ChunkTemplate = require("./ChunkTemplate");
var HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");
var ModuleTemplate = require("./ModuleTemplate");
var CachedSource = require("webpack-core/lib/CachedSource");

function Compilation(compiler) {
	Tapable.call(this);
	this.compiler = compiler;
	this.resolvers = compiler.resolvers;
	this.inputFileSystem = compiler.inputFileSystem;

	var options = this.options = compiler.options;
	this.outputOptions = options && options.output;
	this.bail = options && options.bail;
	this.profile = options && options.profile;

	this.mainTemplate = new MainTemplate(this.outputOptions);
	this.chunkTemplate = new ChunkTemplate(this.outputOptions, this.mainTemplate);
	this.hotUpdateChunkTemplate = new HotUpdateChunkTemplate(this.outputOptions);
	this.moduleTemplate = new ModuleTemplate(this.outputOptions);

	this.entries = [];
	this.preparedChunks = [];
	this.chunks = [];
	this.namedChunks = {};
	this.modules = [];
	this._modules = {};
	this.cache = null;
	this.records = null;
	this.nextFreeModuleId = 1;
	this.nextFreeChunkId = 0;
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

Compilation.prototype.buildModule = function(module, thisCallback) {
	this.applyPlugins("build-module", module);
	if(module.building) return module.building.push(thisCallback);
	var building = module.building = [thisCallback];
	function callback(err) {
		module.building = undefined;
		building.forEach(function(cb) {
			cb(err);
		});
	}
	module.build(this.options, this, this.resolvers.normal, this.inputFileSystem, function(err) {
		module.errors.forEach(function(err) {
			this.errors.push(err);
		}, this);
		module.warnings.forEach(function(err) {
			this.warnings.push(err);
		}, this);
		if(err) {
			module.error = err;
			this.applyPlugins("failed-module", module);
			return callback(err);
		}
		this.applyPlugins("succeed-module", module);
		return callback();
	}.bind(this));
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
	var start = this.profile && +new Date();

	var factories = [];
	for(var i = 0; i < dependencies.length; i++) {
		var factory = this.dependencyFactories.get(dependencies[i][0].Class);
		if(!factory) {
			return callback(new Error("No module factory availible for dependency type: " + dependencies[i][0].Class.name));
		}
		factories[i] = [factory, dependencies[i]];
	}
	async.forEach(factories, function(item, callback) {
		var dependencies = item[1];
		var criticalDependencies = dependencies.filter(function(d) {
			return !!d.critical;
		});
		if(criticalDependencies.length > 0) {
			this.warnings.push(new CriticalDependenciesWarning(module, criticalDependencies));
		}

		var errorAndCallback = function errorAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			module.dependenciesErrors.push(err);
			this.errors.push(err);
			if(bail) {
				callback(err);
			} else {
				callback();
			}
		}.bind(this);
		var warningAndCallback = function warningAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			module.dependenciesWarnings.push(err);
			this.warnings.push(err);
			callback();
		}.bind(this);

		var factory = item[0];
		factory.create(module.context, dependencies[0], function(err, dependantModule) {
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
				return errorOrWarningAndCallback(new ModuleNotFoundError(module, err));
			}
			if(!dependantModule) {
				return process.nextTick(callback);
			}
			if(this.profile) {
				if(!dependantModule.profile) {
					dependantModule.profile = {};
				}
				var afterFactory = +new Date();
				dependantModule.profile.factory = afterFactory - start;
			}

			dependantModule.issuer = module.identifier();
			var newModule = this.addModule(dependantModule, cacheGroup);

			if(!newModule) { // from cache
				dependantModule = this.getModule(dependantModule);

				if(dependantModule.optional) {
					dependantModule.optional = isOptional();
				}

				if(dependantModule.id === 0) {
					return errorOrWarningAndCallback(
						new ModuleNotFoundError(module, new Error("a dependency to an entry point is not allowed"))
					);
				}

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				if(this.profile) {
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
				if(this.profile) {
					newModule.profile = dependantModule.profile;
				}

				newModule.optional = isOptional();
				newModule.issuer = dependantModule.issuer;
				dependantModule = newModule;

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				if(this.profile) {
					var afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}

				if(recursive) {
					return process.nextTick(this.processModuleDependencies.bind(this, dependantModule, callback));
				} else {
					return process.nextTick(callback);
				}
			}

			dependantModule.optional = isOptional();

			dependencies.forEach(function(dep) {
				dep.module = dependantModule;
				dependantModule.addReason(module, dep);
			});

			this.buildModule(dependantModule, function(err) {
				if(err) {
					return errorOrWarningAndCallback(err);
				}

				if(this.profile) {
					var afterBuilding = +new Date();
					dependantModule.profile.building = afterBuilding - afterFactory;
				}

				if(recursive) {
					this.processModuleDependencies(dependantModule, callback);
				} else {
					return callback();
				}
			}.bind(this));

		}.bind(this));
	}.bind(this), function(err) {
		if(err) {
			return callback(err);
		}

		return callback();
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

	if(typeof dependency !== "object" || dependency === null || !dependency.Class) {
		throw new Error("Parameter 'dependency' must be a Dependency");
	}

	var moduleFactory = this.dependencyFactories.get(dependency.Class);
	if(!moduleFactory) {
		throw new Error("No dependency factory availible for this dependency type: " + dependency.Class.name);
	}

	moduleFactory.create(context, dependency, function(err, module) {
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
		}

		onModule(module);

		if(result instanceof Module) {
			moduleReady.call(this);
		} else {
			this.buildModule(module, function(err) {
				if(err) {
					return errorAndCallback(err);
				}

				if(this.profile) {
					var afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}

				moduleReady.call(this);
			}.bind(this));
		}

		function moduleReady() {
			this.processModuleDependencies(module, function(err) {
				if(err) {
					return callback(err);
				}

				return callback(null, module);
			}.bind(this));
		}
	}.bind(this));
};

Compilation.prototype.addEntry = function process(context, entry, name, callback) {
	this._addModuleChain(context, entry, function(module) {

		entry.module = module;
		this.entries.push(module);
		module.issuer = null;
		module.id = 0;

	}.bind(this), function(err, module) {
		if(err) {
			return callback(err);
		}

		if(module) {
			if(module.reasons.length > 0) {
				return callback(new Error("module cannot be added as entry point, because its already in the bundle"));
			}
			this.preparedChunks.push({
				name: name,
				module: module
			});
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
	this.buildModule(module, function(err) {
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

Compilation.prototype.seal = function seal(callback) {
	this.applyPlugins("seal");
	this.preparedChunks.forEach(function(preparedChunk) {
		var module = preparedChunk.module;
		var chunk = this.addChunk(preparedChunk.name, module);
		chunk.initial = chunk.entry = true;
		chunk.addModule(module);
		module.addChunk(chunk);
		this.processDependenciesBlockForChunk(module, chunk);
	}, this);
	this.applyPlugins("optimize");

	this.applyPlugins("optimize-modules", this.modules);
	this.applyPlugins("after-optimize-modules", this.modules);

	this.applyPlugins("optimize-chunks", this.chunks);
	this.applyPlugins("after-optimize-chunks", this.chunks);

	this.applyPluginsAsync("optimize-tree", this.chunks, this.modules, function(err) {
		if(err) {
			return callback(err);
		}

		this.applyPlugins("after-optimize-tree", this.chunks, this.modules);

		var shouldRecord = this.applyPluginsBailResult("should-record") !== false;

		this.applyPlugins("revive-modules", this.modules, this.records);
		this.applyPlugins("optimize-module-order", this.modules);
		this.applyModuleIds();
		this.applyPlugins("optimize-module-ids", this.modules);
		this.applyPlugins("after-optimize-module-ids", this.modules);
		if(shouldRecord)
			this.applyPlugins("record-modules", this.modules, this.records);

		this.applyPlugins("revive-chunks", this.chunks, this.records);
		this.applyPlugins("optimize-chunk-order", this.chunks);
		this.applyChunkIds();
		this.applyPlugins("optimize-chunk-ids", this.chunks);
		this.applyPlugins("after-optimize-chunk-ids", this.chunks);
		if(shouldRecord)
			this.applyPlugins("record-chunks", this.chunks, this.records);

		this.sortItems();
		this.applyPlugins("before-hash");
		this.createHash();
		this.applyPlugins("after-hash");
		this.applyPlugins("before-chunk-assets");
		this.createChunkAssets();
		this.applyPlugins("additional-chunk-assets", this.chunks);
		this.summarizeDependencies();
		if(shouldRecord)
			this.applyPlugins("record", this, this.records);

		this.applyPluginsAsync("additional-assets", function(err) {
			if(err) {
				return callback(err);
			}
			this.applyPluginsAsync("optimize-chunk-assets", this.chunks, function(err) {
				if(err) {
					return callback(err);
				}
				this.applyPlugins("after-optimize-chunk-assets", this.chunks);
				this.applyPluginsAsync("optimize-assets", this.assets, function(err) {
					if(err) {
						return callback(err);
					}
					this.applyPlugins("after-optimize-assets", this.assets);
					return callback();
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this));
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

Compilation.prototype.processDependenciesBlockForChunk = function processDependenciesBlockForChunk(block, chunk) {
	if(block.blocks) {
		block.blocks.forEach(function(b) {
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
			this.processDependenciesBlockForChunk(b, c);
		}, this);
	}
	if(block.dependencies) {
		block.dependencies.forEach(iteratorDependency, this);
	}
	if(block.variables) {
		block.variables.forEach(function(v) {
			v.dependencies.forEach(iteratorDependency, this);
		}, this);
	}
	function iteratorDependency(d) {
		if(!d.module || d.weak) {
			return;
		}
		if(d.module.error) {
			d.module = null;
			return;
		}
		if(chunk.addModule(d.module)) {
			d.module.addChunk(chunk);
			this.processDependenciesBlockForChunk(d.module, chunk);
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
	this.modules.forEach(function(module) {
		if(module.id === null) {
			module.id = this.nextFreeModuleId++;
		}
	}, this);
};

Compilation.prototype.applyChunkIds = function applyChunkIds() {
	this.chunks.forEach(function(chunk) {
		if(chunk.id === null) {
			chunk.id = this.nextFreeChunkId++;
		}
		if(!chunk.ids) {
			chunk.ids = [chunk.id];
		}
	}, this);
};

Compilation.prototype.sortItems = function sortItems() {
	function byId(a, b) {
		return a.id - b.id;
	}
	this.chunks.sort(byId);
	this.modules.sort(byId);
	this.modules.forEach(function(module) {
		module.chunks.sort(byId);
		module.reasons.sort(function(a, b) {
			return byId(a.module, b.module)
		});
	});
	this.chunks.forEach(function(chunk) {
		chunk.modules.sort(byId);
	});
};

Compilation.prototype.summarizeDependencies = function summarizeDependencies() {
	function filterDups(array) {
		var newArray = [];
		for(var i = 0; i < array.length; i++) {
			if(i === 0 || array[i-1] !== array[i])
				newArray.push(array[i]);
		}
		return newArray;
	}
	this.fileDependencies = [];
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
			}, this)
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
	this.mainTemplate.updateHash(hash);
	this.chunkTemplate.updateHash(hash);
	this.moduleTemplate.updateHash(hash);
	var i, chunk;
	for(i = 0; i < this.chunks.length; i++) {
		var chunk = this.chunks[i];
		var chunkHash = require("crypto").createHash(hashFunction);
		chunk.updateHash(chunkHash);
		this.chunkTemplate.updateHash(chunkHash);
		this.applyPlugins("chunk-hash", chunk, chunkHash);
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

Compilation.prototype.createChunkAssets = function createChunkAssets() {
	var outputOptions = this.outputOptions;
	var filename = outputOptions.filename || "bundle.js";
	var chunkFilename = outputOptions.chunkFilename || "[id]." + filename;
	var namedChunkFilename = outputOptions.namedChunkFilename || null;
	for(var i = 0; i < this.modules.length; i++) {
		var module = this.modules[i];
		if(module.assets) {
			Object.keys(module.assets).forEach(function(name) {
				var file = this.getPath(name);
				this.assets[file] = module.assets[name];
				this.applyPlugins("module-asset", module, file);
			}, this);
		}
	}
	for(var i = 0; i < this.chunks.length; i++) {
		var chunk = this.chunks[i];
		chunk.files = [];
		var chunkHash = chunk.hash;
		var source;
		var file;
		var filenameTemplate = chunk.filenameTemplate ?	chunk.filenameTemplate :
			chunk.initial ? filename :
			chunkFilename;
		var usedHash = !chunk.entry || (this.mainTemplate.useChunkHash && this.mainTemplate.useChunkHash(chunk)) ? chunkHash : this.fullHash;
		if(this.cache && this.cache["c" + chunk.id] && this.cache["c" + chunk.id].hash === usedHash) {
			source = this.cache["c" + chunk.id].source;
		} else {
			if(chunk.entry) {
				source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
			} else {
				source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
			}
			if(this.cache) {
				this.cache["c" + chunk.id] = {
					hash: usedHash,
					source: source = (source instanceof CachedSource ? source : new CachedSource(source))
				}
			}
		}
		this.assets[
			file = this.getPath(filenameTemplate, {
				chunk: chunk
			})
		] = source;
		chunk.files.push(file);
		this.applyPlugins("chunk-asset", chunk, file);
		if(chunk.id !== 0 && namedChunkFilename && chunk.name) {
			this.assets[
				file = this.getPath(namedChunkFilename, {
					chunk: chunk
				})
			] = source;
			chunk.files.push(file);
			this.applyPlugins("chunk-asset", chunk, file);
		}
	}
};

Compilation.prototype.getPath = function (filename, data) {
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
