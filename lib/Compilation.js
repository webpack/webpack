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
var Module = require("./Module");
var ArrayMap = require("./ArrayMap");
var Chunk = require("./Chunk");
var Stats = require("./Stats");

function Compilation(compiler) {
	Tapable.call(this);
	this.compiler = compiler;
	this.mainTemplate = compiler.mainTemplate;
	this.chunkTemplate = compiler.chunkTemplate;
	this.moduleTemplate = compiler.moduleTemplate;
	this.options = compiler.options;
	this.resolvers = compiler.resolvers;
	this.inputFileSystem = compiler.inputFileSystem;
	var options = compiler.options;
	this.outputOptions = options && options.output;
	this.bail = options && options.bail;
	this.entries = [];
	this.chunks = [];
	this.namedChunks = {};
	this.modules = [];
	this._modules = {};
	this.cache = null;
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
	if(this.cache && this.cache[identifier]) {
		var cacheModule = this.cache[identifier];					
		
		var rebuild = true;
		if(!cacheModule.error && cacheModule.cacheable && this.fileTimestamps && this.contextTimestamps) {
			rebuild = cacheModule.needRebuild(this.fileTimestamps, this.contextTimestamps);
		}
				
		if(!rebuild) {
			cacheModule.disconnect();
			this._modules[identifier] = cacheModule;
			this.modules.push(cacheModule);
			return cacheModule;
		}
	}
	this._modules[identifier] = module;
	if(this.cache) this.cache[identifier] = module; 
	this.modules.push(module);
	return true;
};

Compilation.prototype.getModule = function(module) {
	var identifier = module.identifier();
	return this._modules[identifier];
};

Compilation.prototype.buildModule = function(module, callback) {
	this.applyPlugins("build-module", module);
	module.build(this.options, this, this.resolvers.normal, this.inputFileSystem, function(err) {
		if(err) {
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
		var errorAndCallback = function errorAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			this.errors.push(err);
			callback();
		}.bind(this);
		var warningAndCallback = function warningAndCallback(err) {
			err.dependencies = dependencies;
			err.origin = module;
			this.warnings.push(err);
			callback();
		}.bind(this);

		var factory = item[0];
		factory.create(module.context, dependencies[0], function(err, dependantModule) {
			function isOptional() {
				return dependencies.filter(function(d) { return !d.optional }).length > 0;
			}
			function errorOrWarningAndCallback(err) {
				if(isOptional())
					return errorAndCallback(err);
				else
					return warningAndCallback(err);
			}
			if(err) return errorOrWarningAndCallback(new ModuleNotFoundError(module, err));
			if(!dependantModule) return callback();
			
			var newModule = this.addModule(dependantModule);

			if(!newModule) {
				dependantModule = this.getModule(dependantModule);

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				return callback();
			}

			if(newModule instanceof Module) { // from cache
				dependantModule = newModule;
				
				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				return this.processModuleDependencies(dependantModule, callback);
			}
			
			this.buildModule(dependantModule, function(err) {
				if(err) return errorOrWarningAndCallback(err);

				dependencies.forEach(function(dep) {
					dep.module = dependantModule;
					dependantModule.addReason(module, dep);
				});

				this.processModuleDependencies(dependantModule, callback);
			}.bind(this));

		}.bind(this));
	}.bind(this), function(err) {
		if(err) callback(err);

		return callback();
	});
};

Compilation.prototype.addEntry = function process(context, entry, name, callback) {
	var errorAndCallback = this.bail ? function errorAndCallback(err) {
		callback(err);
	} : function errorAndCallback(err) {
		err.dependencies = [entry];
		this.errors.push(err);
		callback();
	}.bind(this);

	if(!(entry instanceof Dependency))
		return callback(new Error("Parameter 'entry' must be a Dependency"));

	var moduleFactory = this.dependencyFactories.get(entry.Class);
	if(!moduleFactory)
		return callback(new Error("No dependency factory availible for this entry dependency type: " + entry.Class.name));

	moduleFactory.create(context, entry, function(err, module) {
		if(err) return errorAndCallback(new EntryModuleNotFoundError(err));

		var result = this.addModule(module);
		if(!result) {
			return callback(new Error("Entry module is already added"));
		}
		
		if(result instanceof Module) {
			module = result;
		}

		this.entries.push(module);
		module.id = 0;

		if(result instanceof Module) {
			entryReady.call(this);
		} else {
			this.buildModule(module, function(err) {
				if(err) return errorAndCallback(err);

				entryReady.call(this);
			}.bind(this));
		}
		
		function entryReady() {
			this.processModuleDependencies(module, function(err) {
				if(err) return callback(err);

				var chunk = this.addChunk(name);
				chunk.id = 0;
				chunk.entry = true;
				chunk.addModule(module);
				module.addChunk(chunk);
				this.processDependenciesBlockForChunk(module, chunk);
				return callback();
			}.bind(this));
		}
	}.bind(this));
};

Compilation.prototype.seal = function seal(callback) {
	this.applyPlugins("seal");
	this.applyPlugins("optimize");
	this.applyPlugins("optimize-modules", this.modules);
	this.applyPlugins("after-optimize-modules", this.modules);
	this.applyPlugins("optimize-chunks", this.chunks);
	this.applyPlugins("after-optimize-chunks", this.chunks);
	this.applyModuleIds();
	this.applyChunkIds();
	this.sortItems();
	this.createChunkAssets();
	this.summarizeDependencies();
	this.applyPluginsAsync("optimize-chunk-assets", this.chunks, function(err) {
		if(err) return callback(err);
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
	var i = 0;
	function entryChunks(m) {
		return m.chunks.filter(function(c) {
			return c.entry;
		}).length;
	}
	function occursInEntry(m) {
		return m.reasons.map(function(r) {
			if(!r.module) return 0;
			return entryChunks(r.module);
		}).reduce(function(a, b) { return a+b; }, 0) + entryChunks(m);
	}
	function occurs(m) {
		return m.reasons.map(function(r) {
			if(!r.module) return 0;
			return r.module.chunks.length;
		}).reduce(function(a, b) { return a+b; }, 0) + m.chunks.length;
	}
	this.modules.sort(function(a, b) {
		var aEntryOccurs = occursInEntry(a);
		var bEntryOccurs = occursInEntry(b);
		if(aEntryOccurs > bEntryOccurs) return -1;
		if(aEntryOccurs < bEntryOccurs) return 1;
		var aOccurs = occurs(a);
		var bOccurs = occurs(b);
		if(aOccurs > bOccurs) return -1;
		if(aOccurs < bOccurs) return 1;
		if(a.identifier() > b.identifier()) return 1;
		if(a.identifier() < b.identifier()) return -1;
		return 0;
	});
	this.modules.forEach(function(module) {
		if(module.id === null)
			module.id = ++i;
	});
};

Compilation.prototype.applyChunkIds = function applyChunkIds() {
	var i = 0;
	function occursInEntry(c) {
		return c.parents.filter(function(p) {
			return p.entry;
		}).length;
	}
	function occurs(c) {
		return c.blocks.length;
	}
	this.chunks.forEach(function(c) {
		c.modules.sort(function(a, b) {
			if(a.identifier() > b.identifier()) return 1;
			if(a.identifier() < b.identifier()) return -1;
			return 0;
		});
	});
	this.chunks.sort(function(a, b) {
		var aEntryOccurs = occursInEntry(a);
		var bEntryOccurs = occursInEntry(b);
		if(aEntryOccurs > bEntryOccurs) return -1;
		if(aEntryOccurs < bEntryOccurs) return 1;
		var aOccurs = occurs(a);
		var bOccurs = occurs(b);
		if(aOccurs > bOccurs) return -1;
		if(aOccurs < bOccurs) return 1;
		if(a.modules.length > b.modules.length) return -1;
		if(a.modules.length < b.modules.length) return 1;
		for(var i = 0; i < a.modules.length; i++) {
			if(a.modules[i].identifier() > b.modules[i].identifier()) return -1;
			if(a.modules[i].identifier() < b.modules[i].identifier()) return 1;
		}
		return 0;
	});
	this.chunks.forEach(function(chunk) {
		if(chunk.id === null)
			chunk.id = ++i;
	});
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

var REGEXP_ID = /\[id\]/g;
var REGEXP_NAME = /\[name\]/g;
var REGEXP_HASH = /\[hash\]/g;
Compilation.prototype.createChunkAssets = function createChunkAssets() {
	var outputOptions = this.outputOptions || {};
	var filename = outputOptions.filename || "bundle.js";
	var chunkFilename = outputOptions.chunkFilename || "[id]." + filename.replace(REGEXP_NAME, "");
	var namedChunkFilename = outputOptions.namedChunkFilename || null;
	var hash = new (require("crypto").Hash)("md5");
	this.mainTemplate.updateHash(hash);
	this.chunkTemplate.updateHash(hash);
	this.moduleTemplate.updateHash(hash);
	var i, chunk;
	for(i = 0; i < this.modules.length; i++) {
		var module = this.modules[i];
		if(module.assets) {
			Object.keys(module.assets).forEach(function(name) {
				this.assets[name] = module.assets[name];
			}, this);
		}
	}
	for(i = 0; i < this.chunks.length; i++) {
		var chunk = this.chunks[i];
		chunk.updateHash(hash);
	}
	this.hash = hash = hash.digest("hex");
	for(i = 0; i < this.chunks.length; i++) {
		chunk = this.chunks[i];
		chunk.files = [];
		var source;
		var file;
		if(chunk.entry) {
			source = this.mainTemplate.render(hash, chunk, this.moduleTemplate, this.dependencyTemplates);
			this.assets[file = filename.replace(REGEXP_HASH, hash).replace(REGEXP_ID, chunk.id).replace(REGEXP_NAME, chunk.name || "")] = source;
			chunk.files.push(file);
		} else {
			source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
			this.assets[file = chunkFilename.replace(REGEXP_HASH, hash).replace(REGEXP_ID, chunk.id)] = source;
			chunk.files.push(file);
		}
		if(namedChunkFilename && chunk.name) {
			this.assets[file = namedChunkFilename.replace(REGEXP_HASH, hash).replace(REGEXP_ID, chunk.id).replace(REGEXP_NAME, chunk.name || "")] = source;
			chunk.files.push(file);
		}
	}
};

Compilation.prototype.getStats = function() {
	return new Stats(this);
};

Compilation.prototype.createChildCompiler = function(name, outputOptions) {
	return this.compiler.createChildCompiler(this, name, outputOptions);
};
