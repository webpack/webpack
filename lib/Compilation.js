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
var Template = require("./Template");

function Compilation(compiler) {
	Tapable.call(this);
	this.compiler = compiler;
	this.mainTemplate = compiler.mainTemplate;
	this.chunkTemplate = compiler.chunkTemplate;
	this.moduleTemplate = compiler.moduleTemplate;
	this.resolvers = compiler.resolvers;
	this.inputFileSystem = compiler.inputFileSystem;
	var options = this.options = compiler.options;
	this.outputOptions = options && options.output;
	this.bail = options && options.bail;
	this.profile = options && options.profile;
	this.entries = [];
	this.preparedChunks = [];
	this.chunks = [];
	this.namedChunks = {};
	this.modules = [];
	this._modules = {};
	this.cache = null;
	this.records = null;
	this.nextFreeModuleId = 1;
	this.nextFreeChunkId = 1;
	this.assets = {};
	this.errors = [];
	this.warnings = [];
	this.children = [];
	this.dependencyFactories = new ArrayMap();
	this.dependencyTemplates = new ArrayMap();
}
module.exports = Compilation;

Compilation.prototype = Object.create(Tapable.prototype);
Compilation.prototype.addModule = function(module) {
	var identifier = module.identifier();
	if(this._modules[identifier]) return false;
	if(this.cache && this.cache["m" + identifier]) {
		var cacheModule = this.cache["m" + identifier];

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
	if(this.cache) this.cache["m" + identifier] = module;
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

Compilation.prototype.buildModule = function(module, callback) {
	this.applyPlugins("build-module", module);
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
	var errorAndCallback = this.bail ? function errorAndCallback(err) {
		callback(err);
	} : function errorAndCallback(err) {
		this.errors.push(err);
		callback();
	}.bind(this);

	var dependencies = [];
	function addDependency(dep) {
		for(var i = 0; i < dependencies.length; i++) {
			if(dep.isEqualResource(dependencies[i][0]))
				return dependencies[i].push(dep);
		}
		dependencies.push([dep]);
	}
	function addDependenciesBlock(block) {
		block.dependencies.forEach(addDependency);
		block.blocks.forEach(addDependenciesBlock);
		block.variables.forEach(function(v) {
			v.dependencies.forEach(addDependency);
		});
	}
	addDependenciesBlock(module);
	var factories = [];
	for(var i = 0; i < dependencies.length; i++) {
		var factory = this.dependencyFactories.get(dependencies[i][0].Class);
		if(!factory)
			return callback(new Error("No module factory availible for dependency type: " + dependencies[i][0].Class.name));
		factories[i] = [factory, dependencies[i]];
	}
	async.forEach(factories, function(item, callback) {
		var dependencies = item[1];
		var criticalDependencies = dependencies.filter(function(d) { return !!d.critical });
		if(criticalDependencies.length > 0) {
			this.warnings.push(new CriticalDependenciesWarning(module, criticalDependencies));
		}

		var errorAndCallback = function errorAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			module.dependenciesErrors.push(err);
			this.errors.push(err);
			callback();
		}.bind(this);
		var warningAndCallback = function warningAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			module.dependenciesWarnings.push(err);
			this.warnings.push(err);
			callback();
		}.bind(this);

		var factory = item[0];
		if(this.profile) var start = +new Date();
		factory.create(module.context, dependencies[0], function(err, dependantModule) {
			function isOptional() {
				return dependencies.filter(function(d) { return !d.optional }).length == 0;
			}
			function errorOrWarningAndCallback(err) {
				if(isOptional())
					return warningAndCallback(err);
				else
					return errorAndCallback(err);
			}
			if(err) return errorOrWarningAndCallback(new ModuleNotFoundError(module, err));
			if(!dependantModule) return callback();
			if(this.profile) {
				if(!dependantModule.profile) dependantModule.profile = {};
				var afterFactory = +new Date();
				dependantModule.profile.factory = afterFactory - start;
			}

			dependantModule.issuer = module.identifier();
			var newModule = this.addModule(dependantModule);

			if(!newModule) {
				dependantModule = this.getModule(dependantModule);

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				if(this.profile) {
					if(!module.profile) module.profile = {};
					var time = +new Date() - start;
					if(!module.profile.dependencies || time > module.profile.dependencies)
						module.profile.dependencies = time;
				}

				return callback();
			}

			if(newModule instanceof Module) { // from cache
				if(this.profile)
					newModule.profile = dependantModule.profile;

				newModule.issuer = dependantModule.issuer;
				dependantModule = newModule;

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				return this.processModuleDependencies(dependantModule, callback);
			}

			dependencies.forEach(function(dep) {
				dep.module = dependantModule;
				dependantModule.addReason(module, dep);
			});

			this.buildModule(dependantModule, function(err) {
				if(err) return errorOrWarningAndCallback(err);

				if(this.profile) {
					var afterBuilding = +new Date();
					dependantModule.profile.building = afterBuilding - afterFactory;
				}

				this.processModuleDependencies(dependantModule, callback);
			}.bind(this));

		}.bind(this));
	}.bind(this), function(err) {
		if(err) callback(err);

		return callback();
	});
};

Compilation.prototype._addModuleChain = function process(context, dependency, onModule, callback) {
	var errorAndCallback = this.bail ? function errorAndCallback(err) {
		callback(err);
	} : function errorAndCallback(err) {
		err.dependencies = [dependency];
		this.errors.push(err);
		callback();
	}.bind(this);

	if(!(typeof dependency == "object" && dependency != null && dependency.Class))
		throw new Error("Parameter 'dependency' must be a Dependency");

	var moduleFactory = this.dependencyFactories.get(dependency.Class);
	if(!moduleFactory)
		throw new Error("No dependency factory availible for this dependency type: " + dependency.Class.name);

	if(this.profile) var start = +new Date();
	moduleFactory.create(context, dependency, function(err, module) {
		if(err) return errorAndCallback(new EntryModuleNotFoundError(err));

		if(this.profile) {
			if(!module.profile) module.profile = {};
			var afterFactory = +new Date();
			module.profile.factory = afterFactory - start;
		}

		var result = this.addModule(module);
		if(!result) {
			module = this.getModule(module);

			onModule(module);

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
				if(err) return errorAndCallback(err);

				if(this.profile) {
					var afterBuilding = +new Date();
					module.profile.building = afterBuilding - afterFactory;
				}

				moduleReady.call(this);
			}.bind(this));
		}

		function moduleReady() {
			this.processModuleDependencies(module, function(err) {
				if(err) return callback(err);

				return callback(null, module);
			}.bind(this));
		}
	}.bind(this));
};

Compilation.prototype.addEntry = function process(context, entry, name, callback) {
	this._addModuleChain(context, entry, function(module) {

		this.entries.push(module);
		module.id = 0;

	}.bind(this), function(err, module) {
		if(err) return callback(err);

		if(module) {
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

	}, callback);
};

Compilation.prototype.seal = function seal(callback) {
	this.applyPlugins("seal");
	this.preparedChunks.forEach(function(preparedChunk) {
		var module = preparedChunk.module;
		var chunk = this.addChunk(preparedChunk.name);
		chunk.id = 0;
		chunk.entry = true;
		chunk.addModule(module);
		module.addChunk(chunk);
		this.processDependenciesBlockForChunk(module, chunk);
	}, this);
	this.applyPlugins("optimize");

	this.applyPlugins("optimize-modules", this.modules);
	this.applyPlugins("after-optimize-modules", this.modules);

	this.applyPlugins("optimize-chunks", this.chunks);
	this.applyPlugins("after-optimize-chunks", this.chunks);

	this.applyPlugins("revive-modules", this.modules, this.records);
	this.applyPlugins("optimize-module-order", this.modules);
	this.applyModuleIds();
	this.applyPlugins("optimize-module-ids", this.modules);
	this.applyPlugins("after-optimize-module-ids", this.modules);
	this.applyPlugins("record-modules", this.modules, this.records);

	this.applyPlugins("revive-chunks", this.chunks, this.records);
	this.applyPlugins("optimize-chunk-order", this.chunks);
	this.applyChunkIds();
	this.applyPlugins("optimize-chunk-ids", this.chunks);
	this.applyPlugins("after-optimize-chunk-ids", this.chunks);
	this.applyPlugins("record-chunks", this.chunks, this.records);

	this.sortItems();
	this.createChunkAssets();
	this.summarizeDependencies();
	this.applyPlugins("record", this, this.records);

	this.applyPluginsAsync("optimize-chunk-assets", this.chunks, function(err) {
		if(err) return callback(err);
		this.applyPlugins("after-optimize-chunk-assets", this.chunks);
		this.applyPluginsAsync("optimize-assets", this.assets, function(err) {
			if(err) return callback(err);
			this.applyPlugins("after-optimize-assets", this.assets);
			return callback();
		}.bind(this));
	}.bind(this));
};

Compilation.prototype.addChunk = function addChunk(name) {
	if(name) {
		if(Object.prototype.hasOwnProperty.call(this.namedChunks, name))
			return this.namedChunks[name];
	}
	var chunk = new Chunk(name);
	this.chunks.push(chunk);
	if(name) {
		this.namedChunks[name] = chunk;
	}
	return chunk;
};

Compilation.prototype.processDependenciesBlockForChunk = function processDependenciesBlockForChunk(block, chunk) {
	block.blocks.forEach(function(b) {
		var c;
		if(!b.chunk) {
			c = this.addChunk(b.chunkName);
			b.chunk = c;
			c.addBlock(b);
		} else {
			c = b.chunk;
		}
		chunk.addChunk(c);
		c.addParent(chunk);
		this.processDependenciesBlockForChunk(b, c);
	}, this);
	function iteratorDependency(d) {
		if(!d.module) return;
		if(d.module.error) {
			d.module = null;
			return;
		}
		if(chunk.addModule(d.module)) {
			d.module.addChunk(chunk);
			this.processDependenciesBlockForChunk(d.module, chunk);
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
			if(chunk.id === null)
				chunk.id = this.nextFreeChunkId++;
		}
		if(!chunk.ids)
			chunk.ids = [chunk.id];
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
	});
	this.chunks.forEach(function(chunk) {
		chunk.modules.sort(byId);
	});
};

Compilation.prototype.summarizeDependencies = function summarizeDependencies() {
	function filterDups(array) {
		var newArray = [];
		for(var i = 0; i < array.length; i++) {
			if(i == 0 || array[i-1] != array[i])
				newArray.push(array[i]);
		}
		return newArray;
	}
	this.fileDependencies = [];
	this.contextDependencies = [];
	this.children.forEach(function(child) {
		this.fileDependencies = this.fileDependencies.concat(child.fileDependencies);
		this.contextDependencies = this.contextDependencies.concat(child.contextDependencies);
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
	this.fileDependencies.sort();
	this.fileDependencies = filterDups(this.fileDependencies);
	this.contextDependencies.sort();
	this.contextDependencies = filterDups(this.contextDependencies);
};

Compilation.prototype.createChunkAssets = function createChunkAssets() {
	var outputOptions = this.outputOptions || {};
	var filename = outputOptions.filename || "bundle.js";
	var chunkFilename = outputOptions.chunkFilename || "[id]." + filename.replace(Template.REGEXP_NAME, "");
	var namedChunkFilename = outputOptions.namedChunkFilename || null;
	var hashFunction = outputOptions.hashFunction;
	var hashDigest = outputOptions.hashDigest;
	var hashDigestLength = outputOptions.hashDigestLength;
	var hash = new (require("crypto").Hash)(hashFunction);
	this.mainTemplate.updateHash(hash);
	this.chunkTemplate.updateHash(hash);
	this.moduleTemplate.updateHash(hash);
	var i, chunk;
	for(i = 0; i < this.chunks.length; i++) {
		var chunk = this.chunks[i];
		var chunkHash = new (require("crypto").Hash)(hashFunction);
		chunk.updateHash(chunkHash);
		this.chunkTemplate.updateHash(chunkHash);
		chunk.hash = chunkHash.digest(hashDigest);
		hash.update(chunk.hash);
		chunk.renderedHash = chunk.hash.substr(0, hashDigestLength);
	}
	hash = hash.digest(hashDigest);
	this.hash = hash.substr(0, hashDigestLength);
	for(i = 0; i < this.modules.length; i++) {
		var module = this.modules[i];
		if(module.assets) {
			Object.keys(module.assets).forEach(function(name) {
				var file = name.replace(Template.REGEXP_HASH, this.hash);
				this.assets[file] = module.assets[name];
				this.applyPlugins("module-asset", module, file);
			}, this);
		}
	}
	for(i = 0; i < this.chunks.length; i++) {
		chunk = this.chunks[i];
		chunk.files = [];
		var chunkHash = chunk.hash;
		var source;
		var file;
		if(chunk.entry) {
			if(this.cache && this.cache["c" + chunk.id + chunk.name] && this.cache["c" + chunk.id + chunk.name].hash == hash) {
				source = this.cache["c" + chunk.id + chunk.name].source;
			} else {
				source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
				if(this.cache) {
					this.cache["c" + chunk.id + chunk.name] = {
						hash: hash,
						source: source
					}
				}
			}
			this.assets[
				file = filename
					.replace(Template.REGEXP_HASH, this.hash)
					.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
					.replace(Template.REGEXP_ID, chunk.id)
					.replace(Template.REGEXP_NAME, chunk.name || "")
			] = source;
			chunk.files.push(file);
			this.applyPlugins("chunk-asset", chunk, file);
		} else {
			if(this.cache && this.cache["c" + chunk.id] && this.cache["c" + chunk.id].hash == chunkHash) {
				source = this.cache["c" + chunk.id].source;
			} else {
				source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
				if(this.cache) {
					this.cache["c" + chunk.id] = {
						hash: chunkHash,
						source: source
					}
				}
			}
			this.assets[
				file = chunkFilename
					.replace(Template.REGEXP_HASH, this.hash)
					.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
					.replace(Template.REGEXP_ID, chunk.id)
			] = source;
			chunk.files.push(file);
			this.applyPlugins("chunk-asset", chunk, file);
			if(namedChunkFilename && chunk.name) {
				this.assets[
					file = namedChunkFilename
						.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
						.replace(Template.REGEXP_HASH, this.hash)
						.replace(Template.REGEXP_ID, chunk.id)
						.replace(Template.REGEXP_NAME, chunk.name || "")
				] = source;
				chunk.files.push(file);
				this.applyPlugins("chunk-asset", chunk, file);
			}
		}
	}
};

Compilation.prototype.getStats = function() {
	return new Stats(this);
};

Compilation.prototype.createChildCompiler = function(name, outputOptions) {
	return this.compiler.createChildCompiler(this, name, outputOptions);
};
