/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var OriginalSource = require("webpack-core/lib/OriginalSource");
var RawSource = require("webpack-core/lib/RawSource");
var DependenciesBlock = require("./DependenciesBlock");

function ContextModule(resolveDependencies, context, recursive, regExp, addon, async) {
	Module.call(this);
	this.resolveDependencies = resolveDependencies;
	this.context = context;
	this.recursive = recursive;
	this.regExp = regExp;
	this.addon = addon;
	this.async = !!async;
	this.cacheable = true;
	this.contextDependencies = [context];
	this.built = false;
}
module.exports = ContextModule;

ContextModule.prototype = Object.create(Module.prototype);

ContextModule.prototype.identifier = function() {
	var identifier = "";
	identifier += this.context + " ";
	if(this.async)
		identifier += "async ";
	if(!this.recursive)
		identifier += "nonrecursive ";
	if(this.addon)
		identifier += this.addon;
	if(this.regExp)
		identifier += this.regExp;
	return identifier.replace(/ $/, "");
};

function prettyRegExp(str) {
	return str.substring(1, str.length - 1);
}

ContextModule.prototype.readableIdentifier = function(requestShortener) {
	var identifier = "";
	identifier += requestShortener.shorten(this.context) + " ";
	if(this.async)
		identifier += "async ";
	if(!this.recursive)
		identifier += "nonrecursive ";
	if(this.addon)
		identifier += requestShortener.shorten(this.addon);
	if(this.regExp)
		identifier += prettyRegExp(this.regExp + "");
	return identifier.replace(/ $/, "");
};

ContextModule.prototype.needRebuild = function(fileTimestamps, contextTimestamps) {
	var ts = contextTimestamps[this.context];
	if(!ts) return true;
	return ts >= this.builtTime;
};

ContextModule.prototype.disconnect = function disconnect() {
	this.built = false;
	Module.prototype.disconnect.call(this);
};

ContextModule.prototype.build = function(options, compilation, resolver, fs, callback) {
	this.built = true;
	this.builtTime = new Date().getTime();
	var addon = this.addon;
	this.resolveDependencies(fs, this.context, this.recursive, this.regExp, function(err, dependencies) {
		if(err) return callback(err);
		if(dependencies) {
			dependencies.forEach(function(dep) {
				dep.loc = dep.userRequest;
				dep.userRequest = dep.request;
				dep.request = addon + dep.userRequest;
			});
		}
		if(this.async) {
			this.blocks = dependencies && dependencies.map(function(dep) {
				var block = new DependenciesBlock();
				block.dependencies = [dep];
				return block;
			});
		} else {
			this.dependencies = dependencies;
		}
		callback();
	}.bind(this));
};

ContextModule.prototype.source = function() {
	var str;
	var map = {};
	if(this.dependencies && this.dependencies.length > 0) {
		this.dependencies.slice().sort(function(a, b) {
			if(a.userRequest === b.userRequest) return 0;
			return a.userRequest < b.userRequest ? -1 : 1;
		}).forEach(function(dep) {
			if(dep.module)
				map[dep.userRequest] = dep.module.id;
		});
		str = [
			"var map = ", JSON.stringify(map, null, "\t"), ";\n",
			"function webpackContext(req) {\n",
			"\treturn __webpack_require__(webpackContextResolve(req));\n",
			"};\n",
			"function webpackContextResolve(req) {\n",
			"\tvar id = map[req];\n",
			"\tif(!(id + 1)) // check for number\n",
			"\t\tthrow new Error(\"Cannot find module '\" + req + \"'.\");\n",
			"\treturn id;\n",
			"};\n",
			"webpackContext.keys = function webpackContextKeys() {\n",
			"\treturn Object.keys(map);\n",
			"};\n",
			"webpackContext.resolve = webpackContextResolve;\n",
			"module.exports = webpackContext;\n",
			"webpackContext.id = " + this.id + ";\n"
		];
	} else if(this.blocks && this.blocks.length > 0) {
		var items = this.blocks.map(function(block) {
			return {
				dependency: block.dependencies[0],
				block: block,
				userRequest: block.dependencies[0].userRequest
			};
		}).filter(function(item) {
			return item.dependency.module;
		});
		var hasMultipleChunks = false;
		items.sort(function(a, b) {
			if(a.userRequest === b.userRequest) return 0;
			return a.userRequest < b.userRequest ? -1 : 1;
		}).forEach(function(item) {
			if(item.dependency.module) {
				if(item.block.chunks.length > 1)
					hasMultipleChunks = true;
				map[item.userRequest] = [item.dependency.module.id].concat(item.block.chunks.map(function(chunk) {
					return chunk.id;
				}));
			}
		});
		str = [
			"var map = ", JSON.stringify(map, null, "\t"), ";\n",
			"function webpackAsyncContext(req) {\n",
			"\tvar ids = map[req];",
			"\tif(!ids)\n",
			"\t\tthrow new Error(\"Cannot find module '\" + req + \"'.\");\n",
			"\treturn ",
			hasMultipleChunks ?
			"Promise.all(ids.slice(1).map(__webpack_require__.e))" :
			"__webpack_require__.e(ids[1])",
			".then(function() {\n",
			"\t\treturn __webpack_require__(ids[0]);\n",
			"\t});\n",
			"};\n",
			"webpackAsyncContext.keys = function webpackAsyncContextKeys() {\n",
			"\treturn Object.keys(map);\n",
			"};\n",
			"module.exports = webpackAsyncContext;\n",
			"webpackAsyncContext.id = " + this.id + ";\n"
		];
	} else {
		str = [
			"function webpackEmptyContext(req) {\n",
			"\tthrow new Error(\"Cannot find module '\" + req + \"'.\");\n",
			"}\n",
			"webpackEmptyContext.keys = function() { return []; };\n",
			"webpackEmptyContext.resolve = webpackEmptyContext;\n",
			"module.exports = webpackEmptyContext;\n",
			"webpackEmptyContext.id = " + this.id + ";\n"
		];
	}
	if(this.useSourceMap) {
		return new OriginalSource(str.join(""), this.identifier());
	} else {
		return new RawSource(str.join(""));
	}
};

ContextModule.prototype.size = function() {
	return this.dependencies.map(function(dep) {
		return dep.userRequest.length + 5;
	}).reduce(function(a, b) {
		return a + b;
	}, 160);
};
