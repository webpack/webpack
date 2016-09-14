/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var Module = require("./Module");
var SourceMapSource = require("webpack-sources").SourceMapSource;
var OriginalSource = require("webpack-sources").OriginalSource;
var RawSource = require("webpack-sources").RawSource;
var ReplaceSource = require("webpack-sources").ReplaceSource;
var CachedSource = require("webpack-sources").CachedSource;
var LineToLineMappedSource = require("webpack-sources").LineToLineMappedSource;
var ModuleParseError = require("./ModuleParseError");
var TemplateArgumentDependency = require("./dependencies/TemplateArgumentDependency");
var AsyncDependenciesBlock = require("./AsyncDependenciesBlock");

var ModuleBuildError = require("./ModuleBuildError");
var ModuleError = require("./ModuleError");
var ModuleWarning = require("./ModuleWarning");

var runLoaders = require("loader-runner").runLoaders;
var getContext = require("loader-runner").getContext;

function asString(buf) {
	if(Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
}

function NormalModule(request, userRequest, rawRequest, loaders, resource, parser) {
	Module.call(this);
	this.request = request;
	this.userRequest = userRequest;
	this.rawRequest = rawRequest;
	this.parser = parser;
	this.resource = resource;
	this.context = getContext(resource);
	this.loaders = loaders;
	this.fileDependencies = [];
	this.contextDependencies = [];
	this.warnings = [];
	this.errors = [];
	this.error = null;
	this._source = null;
	this.assets = {};
	this.built = false;
	this._cachedSource = null;
}
module.exports = NormalModule;

NormalModule.prototype = Object.create(Module.prototype);
NormalModule.prototype.constructor = NormalModule;

NormalModule.prototype.identifier = function() {
	return this.request;
};

NormalModule.prototype.readableIdentifier = function(requestShortener) {
	return requestShortener.shorten(this.userRequest);
};

function contextify(options, request) {
	return request.split("!").map(function(r) {
		var rp = path.relative(options.context, r);
		if(path.sep === "\\")
			rp = rp.replace(/\\/g, "/");
		if(rp.indexOf("../") !== 0)
			rp = "./" + rp;
		return rp;
	}).join("!");
}

NormalModule.prototype.libIdent = function(options) {
	return contextify(options, this.userRequest);
};

NormalModule.prototype.nameForCondition = function() {
	var idx = this.resource.indexOf("?");
	if(idx >= 0) return this.resource.substr(0, idx);
	return this.resource;
};

NormalModule.prototype.doBuild = function doBuild(options, compilation, resolver, fs, callback) {
	this.cacheable = false;
	var module = this;
	var loaderContext = {
		version: 2,
		emitWarning: function(warning) {
			module.warnings.push(new ModuleWarning(module, warning));
		},
		emitError: function(error) {
			module.errors.push(new ModuleError(module, error));
		},
		exec: function(code, filename) {
			var Module = require("module");
			var m = new Module(filename, module);
			m.paths = Module._nodeModulePaths(module.context);
			m.filename = filename;
			m._compile(code, filename);
			return m.exports;
		},
		resolve: function(context, request, callback) {
			resolver.resolve({}, context, request, callback);
		},
		resolveSync: function(context, request) {
			return resolver.resolveSync({}, context, request);
		},
		options: options
	};
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
	loaderContext.fs = fs;
	compilation.applyPlugins("normal-module-loader", loaderContext, this);
	if(options.loader)
		for(var key in options.loader)
			loaderContext[key] = options.loader[key];

	runLoaders({
		resource: this.resource,
		loaders: this.loaders,
		context: loaderContext,
		readResource: fs.readFile.bind(fs)
	}, function(err, result) {
		if(result) {
			module.cacheable = result.cacheable;
			module.fileDependencies = result.fileDependencies;
			module.contextDependencies = result.contextDependencies;
		}
		if(err) {
			return callback(module.error = new ModuleBuildError(module, err));
		}

		var resourceBuffer = result.resourceBuffer;
		var source = result.result[0];
		var sourceMap = result.result[1];

		if(!Buffer.isBuffer(source) && typeof source !== "string") {
			return callback(module.error = new ModuleBuildError(module, new Error("Final loader didn't return a Buffer or String")));
		}
		source = asString(source);
		if(module.identifier && module.lineToLine && resourceBuffer) {
			module._source = new LineToLineMappedSource(source, module.identifier(),
				asString(resourceBuffer));
		} else if(module.identifier && module.useSourceMap && sourceMap) {
			module._source = new SourceMapSource(source, module.identifier(), sourceMap);
		} else if(module.identifier) {
			module._source = new OriginalSource(source, module.identifier());
		} else {
			module._source = new RawSource(source);
		}
		return callback();
	});
};

NormalModule.prototype.disconnect = function disconnect() {
	this.built = false;
	Module.prototype.disconnect.call(this);
};

NormalModule.prototype.build = function build(options, compilation, resolver, fs, callback) {
	var _this = this;
	_this.buildTimestamp = new Date().getTime();
	_this.built = true;
	_this._source = null;
	_this.error = null;
	return _this.doBuild(options, compilation, resolver, fs, function(err) {
		_this.dependencies.length = 0;
		_this.variables.length = 0;
		_this.blocks.length = 0;
		_this._cachedSource = null;
		if(err) return setError(err);
		if(options.module && options.module.noParse) {
			function testRegExp(regExp) {
				return typeof regExp === "string" ?
					_this.request.indexOf(regExp) === 0 :
					regExp.test(_this.request);
			}
			if(Array.isArray(options.module.noParse)) {
				if(options.module.noParse.some(testRegExp, _this))
					return callback();
			} else if(testRegExp.call(_this, options.module.noParse)) {
				return callback();
			}
		}
		try {
			_this.parser.parse(_this._source.source(), {
				current: _this,
				module: _this,
				compilation: compilation,
				options: options
			});
		} catch(e) {
			var source = _this._source.source();
			return setError(_this.error = new ModuleParseError(_this, source, e));
		}
		return callback();
	});

	function setError(err) {
		_this.meta = null;
		if(_this.error) {
			_this.errors.push(_this.error);
			_this._source = new RawSource("throw new Error(" + JSON.stringify(_this.error.message) + ");");
		} else {
			_this._source = new RawSource("throw new Error('Module build failed');");
		}
		callback();
	}
};

NormalModule.prototype.source = function(dependencyTemplates, outputOptions, requestShortener) {
	var hash = require("crypto").createHash("md5");
	this.updateHash(hash);
	hash = hash.digest("hex");
	if(this._cachedSource && this._cachedSource.hash === hash) {
		return this._cachedSource.source;
	}
	var _source = this._source;
	if(!_source) return new RawSource("throw new Error('No source available');");
	var source = new ReplaceSource(_source);
	this._cachedSource = {
		source: source,
		hash: hash
	};
	var topLevelBlock = this;

	function doDep(dep) {
		var template = dependencyTemplates.get(dep.constructor);
		if(!template) throw new Error("No template for dependency: " + dep.constructor.name);
		template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
	}

	function doVariable(availableVars, vars, variable) {
		var name = variable.name;
		var expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);

		function isEqual(v) {
			return v.name === name && v.expression.source() === expr.source();
		}
		if(availableVars.some(isEqual)) return;
		vars.push({
			name: name,
			expression: expr
		});
	}

	function doBlock(availableVars, block) {
		block.dependencies.forEach(doDep);
		var vars = [];
		if(block.variables.length > 0) {
			block.variables.forEach(doVariable.bind(null, availableVars, vars));
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
			var start = block.range ? block.range[0] : -10;
			var end = block.range ? block.range[1] : (_source.size() + 1);
			if(varStartCode) source.insert(start + 0.5, varStartCode);
			if(varEndCode) source.insert(end + 0.5, "\n/* WEBPACK VAR INJECTION */" + varEndCode);
		}
		block.blocks.forEach(doBlock.bind(null, availableVars.concat(vars)));
	}
	doBlock([], this);
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
