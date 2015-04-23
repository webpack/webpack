/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var NormalModuleMixin = require("webpack-core/lib/NormalModuleMixin");
var SourceMapSource = require("webpack-core/lib/SourceMapSource");
var OriginalSource = require("webpack-core/lib/OriginalSource");
var RawSource = require("webpack-core/lib/RawSource");
var ReplaceSource = require("webpack-core/lib/ReplaceSource");
var CachedSource = require("webpack-core/lib/CachedSource");
var ModuleParseError = require("./ModuleParseError");
var TemplateArgumentDependency = require("./dependencies/TemplateArgumentDependency");
var AsyncDependenciesBlock = require("./AsyncDependenciesBlock");

function NormalModule(request, userRequest, rawRequest, loaders, resource, parser) {
	Module.call(this);
	this.request = request;
	this.userRequest = userRequest;
	this.rawRequest = rawRequest;
	this.parser = parser;
	NormalModuleMixin.call(this, loaders, resource);
	this.meta = {};
	this.assets = {};
	this.built = false;
	this._cachedSource = null;
}
module.exports = NormalModule;

NormalModule.prototype = Object.create(Module.prototype);
NormalModuleMixin.mixin(NormalModule.prototype);

NormalModule.prototype.identifier = function() {
	return this.request;
};

NormalModule.prototype.readableIdentifier = function(requestShortener) {
	return requestShortener.shorten(this.userRequest);
};

NormalModule.prototype.fillLoaderContext = function fillLoaderContext(loaderContext, options, compilation) {
	loaderContext.webpack = true;
	loaderContext.sourceMap = !!this.useSourceMap;
	loaderContext.emitFile = function(name, content, sourceMap) {
		if(typeof sourceMap === "string") {
			this.assets[name] = new OriginalSource(content, sourceMap);
		} else if(sourceMap) {
			this.assets[name] = new SourceMapSource(content, name, sourceMap);
		} else {
			this.assets[name] = new RawSource(content);
		}
	}.bind(this);
	loaderContext._module = this;
	loaderContext._compilation = compilation;
	loaderContext._compiler = compilation.compiler;
	compilation.applyPlugins("normal-module-loader", loaderContext, this);
};

NormalModule.prototype.disconnect = function disconnect() {
	this.built = false;
	Module.prototype.disconnect.call(this);
};

NormalModule.prototype.build = function build(options, compilation, resolver, fs, callback) {
	this.buildTimestamp = new Date().getTime();
	this.built = true;
	return this.doBuild(options, compilation, resolver, fs, function(err) {
		if(err) return callback(err);
		this.dependencies.length = 0;
		this.variables.length = 0;
		this.blocks.length = 0;
		this._cachedSource = null;
		if(options.module && options.module.noParse) {
			if(Array.isArray(options.module.noParse)) {
				if(options.module.noParse.some(function(regExp) {
					return typeof regExp === "string" ?
						this.request.indexOf(regExp) === 0 :
						regExp.test(this.request);
				}, this)) return callback();
			} else if(typeof options.module.noParse === "string" ?
					this.request.indexOf(options.module.noParse) === 0 :
					options.module.noParse.test(this.request)) {
				return callback();
			}
		}
		try {
			this.parser.parse(this._source.source(), {
				current: this,
				module: this,
				compilation: compilation,
				options: options
			});
		} catch(e) {
			var source = this._source.source();
			this._source = null;
			return callback(new ModuleParseError(this, source, e));
		}
		return callback();
	}.bind(this));
};

NormalModule.prototype.source = function(dependencyTemplates, outputOptions, requestShortener) {
	var hash = require("crypto").createHash("md5");
	this.updateHash(hash);
	hash = hash.digest("hex");
	if(this._cachedSource && this._cachedSource.hash === hash) {
		return this._cachedSource.source;
	}
	var _source = this._source;
	if(!_source) return new RawSource("throw new Error('No source availible');");
	var source = new ReplaceSource(_source);
	this._cachedSource = { source: source, hash: hash };
	var topLevelBlock = this;
	function doDep(dep) {
		var template = dependencyTemplates.get(dep.Class);
		if(!template) throw new Error("No template for dependency: " + dep.Class.name);
		template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
	}
	function doVariable(vars, variable) {
		var name = variable.name;
		var expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);
		vars.push({name: name, expression: expr});
	}
	function doBlock(block) {
		block.dependencies.forEach(doDep);
		block.blocks.forEach(doBlock);
		if(block.variables.length > 0) {
			var vars = [];
			block.variables.forEach(doVariable.bind(null, vars));
			var varNames = [];
			var varExpressions = [];
			var varStartCode = "";
			var varEndCode = "";
			function emitFunction() {
				if(varNames.length === 0) return;

				varStartCode += "/* WEBPACK VAR INJECTION */(function(" + varNames.join(", ") + ") {";
				// exports === this in the topLevelBlock, but exports do compress better...
				varEndCode = (topLevelBlock === block ? "}.call(exports, " : "}.call(this, ") +
					varExpressions.map(function(e) {
						return e.source();
					}).join(", ") + "))" + varEndCode;

				varNames.length = 0;
				varExpressions.length = 0;
			}
			vars.forEach(function(v) {
				if(varNames.indexOf(v.name) >= 0) emitFunction();
				varNames.push(v.name);
				varExpressions.push(v.expression);
			});
			emitFunction();
			var start = block.range ? block.range[0] : 0;
			var end = block.range ? block.range[1] : _source.size();
			if(varStartCode) source.insert(start + 0.5, varStartCode);
			if(varEndCode) source.insert(end + 0.5, "\n/* WEBPACK VAR INJECTION */" + varEndCode);
		}
	}
	doBlock(this);
	return new CachedSource(source);
};

NormalModule.prototype.needRebuild = function needRebuild(fileTimestamps, contextTimestamps) {
	var timestamp = 0;
	this.fileDependencies.forEach(function(file) {
		var ts = fileTimestamps[file];
		if(!ts) timestamp = Infinity;
		if(ts > timestamp) timestamp = ts;
	});
	this.contextDependencies.forEach(function(context) {
		var ts = contextTimestamps[context];
		if(!ts) timestamp = Infinity;
		if(ts > timestamp) timestamp = ts;
	});
	return timestamp >= this.buildTimestamp;
};

NormalModule.prototype.size = function() {
	return this._source ? this._source.size() : -1;
};

NormalModule.prototype.updateHash = function(hash) {
	if(this._source) {
		hash.update("source");
		this._source.updateHash(hash);
	} else
		hash.update("null");
	hash.update("meta");
	hash.update(JSON.stringify(this.meta));
	Module.prototype.updateHash.call(this, hash);
};

NormalModule.prototype.getSourceHash = function() {
	if(!this._source) return "";
	var hash = require("crypto").createHash("md5");
	hash.update(this._source.source());
	return hash.digest("hex");
};

NormalModule.prototype.getAllModuleDependencies = function() {
	var list = [];
	function doDep(dep) {
		if(dep.module && list.indexOf(dep.module) < 0)
			list.push(dep.module);
	}
	function doVariable(variable) {
		variable.dependencies.forEach(doDep);
	}
	function doBlock(block) {
		block.variables.forEach(doVariable);
		block.dependencies.forEach(doDep);
		block.blocks.forEach(doBlock);
	}
	doBlock(this);
	return list;
};

NormalModule.prototype.createTemplate = function(keepModules, roots) {
	roots.sort(function(a, b) {
		var ia = a.identifier();
		var ib = b.identifier();
		if(ia < ib) return -1;
		if(ib < ia) return 1;
		return 0;
	});
	var template = new NormalModule("", "", "", [], "", null);
	template._source = this._source;
	template.built = this.built;
	template.templateModules = keepModules;
	template._templateOrigin = this;
	template.readableIdentifier = function() {
		return "template of " + this._templateOrigin.id + " referencing " + keepModules.map(function(m) {
			return m.id;
		}).join(", ");
	};
	template.identifier = function() {
		var array = roots.map(function(m) {
			return m.identifier();
		});
		array.sort();
		return array.join("|");
	};
	var args = template.arguments = [];
	function doDeps(deps) {
		return deps.map(function(dep) {
			if(dep.module && keepModules.indexOf(dep.module) < 0) {
				var argName = "__webpack_module_template_argument_" + args.length + "__";
				args.push(argName);
				return new TemplateArgumentDependency(argName, dep);
			} else {
				return dep;
			}
		});
	}
	function doBlock(block, newBlock) {
		block.variables.forEach(function(variable) {
			var newDependencies = doDeps(variable.dependencies);
			newBlock.addVariable(variable.name, variable.expression, newDependencies);
		});
		newBlock.dependencies = doDeps(block.dependencies);
		block.blocks.forEach(function(childBlock) {
			var newChildBlock = new AsyncDependenciesBlock(childBlock.name, childBlock.module, childBlock.loc);
			newBlock.addBlock(newChildBlock);
			doBlock(childBlock, newChildBlock);
		});
	}
	doBlock(this, template);
	return template;
};

NormalModule.prototype.getTemplateArguments = function(keepModules) {
	var list = [];
	function doDep(dep) {
		if(dep.module && keepModules.indexOf(dep.module) < 0)
			list.push(dep.module);
	}
	function doVariable(variable) {
		variable.dependencies.forEach(doDep);
	}
	function doBlock(block) {
		block.variables.forEach(doVariable);
		block.dependencies.forEach(doDep);
		block.blocks.forEach(doBlock);
	}
	doBlock(this);
	return list;
};
