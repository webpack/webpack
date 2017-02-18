/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const path = require("path");
const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const AsyncDependenciesBlock = require("./AsyncDependenciesBlock");

class ContextModule extends Module {
	constructor(resolveDependencies, context, recursive, regExp, addon, async) {
		super();
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

	identifier() {
		let identifier = "";
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
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString.substring(1, regexString.length - 1);
	}

	readableIdentifier(requestShortener) {
		let identifier = "";
		identifier += requestShortener.shorten(this.context) + " ";
		if(this.async)
			identifier += "async ";
		if(!this.recursive)
			identifier += "nonrecursive ";
		if(this.addon)
			identifier += requestShortener.shorten(this.addon);
		if(this.regExp)
			identifier += this.prettyRegExp(this.regExp + "");
		return identifier.replace(/ $/, "");
	}

	contextify(context, request) {
		return request.split("!").map(function(subrequest) {
			let rp = path.relative(context, subrequest);
			if(path.sep === "\\")
				rp = rp.replace(/\\/g, "/");
			if(rp.indexOf("../") !== 0)
				rp = "./" + rp;
			return rp;
		}).join("!");
	}

	libIdent(options) {
		let identifier = this.contextify(options.context, this.context) + " ";
		if(this.async)
			identifier += "async ";
		if(this.recursive)
			identifier += "recursive ";
		if(this.addon)
			identifier += this.contextify(options.context, this.addon);
		if(this.regExp)
			identifier += this.prettyRegExp(this.regExp + "");
		return identifier.replace(/ $/, "");
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		const ts = contextTimestamps[this.context];
		if(!ts) return true;
		return ts >= this.builtTime;
	}

	unbuild() {
		this.built = false;
		super.unbuild();
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.builtTime = new Date().getTime();
		const addon = this.addon;
		this.resolveDependencies(fs, this.context, this.recursive, this.regExp, (err, dependencies) => {
			if(err) return callback(err);

			if(dependencies) {
				dependencies.forEach(function(dep) {
					dep.loc = dep.userRequest;
					dep.request = addon + dep.request;
				});
			}
			if(this.async) {
				if(dependencies) {
					dependencies.forEach(dep => {
						const block = new AsyncDependenciesBlock(null, dep.module, dep.loc);
						block.addDependency(dep);
						this.addBlock(block);
					});
				}
			} else {
				this.dependencies = dependencies;
			}
			callback();
		});
	}

	source() {
		let str;
		const map = {};
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
				"webpackContext.id = " + JSON.stringify(this.id) + ";\n"
			];
		} else if(this.blocks && this.blocks.length > 0) {
			const items = this.blocks.map(function(block) {
				return {
					dependency: block.dependencies[0],
					block: block,
					userRequest: block.dependencies[0].userRequest
				};
			}).filter(function(item) {
				return item.dependency.module;
			});
			let hasMultipleChunks = false;
			items.sort(function(a, b) {
				if(a.userRequest === b.userRequest) return 0;
				return a.userRequest < b.userRequest ? -1 : 1;
			}).forEach(function(item) {
				if(item.dependency.module) {
					const chunks = item.block.chunks || [];
					if(chunks.length !== 1)
						hasMultipleChunks = true;
					map[item.userRequest] = [item.dependency.module.id].concat(chunks.map(function(chunk) {
						return chunk.id;
					}));
				}
			});
			str = [
				"var map = ", JSON.stringify(map, null, "\t"), ";\n",
				"function webpackAsyncContext(req) {\n",
				"\tvar ids = map[req];",
				"\tif(!ids)\n",
				"\t\treturn Promise.reject(new Error(\"Cannot find module '\" + req + \"'.\"));\n",
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
				"webpackAsyncContext.id = " + JSON.stringify(this.id) + ";\n"
			];
		} else {
			str = [
				"function webpackEmptyContext(req) {\n",
				"\tthrow new Error(\"Cannot find module '\" + req + \"'.\");\n",
				"}\n",
				"webpackEmptyContext.keys = function() { return []; };\n",
				"webpackEmptyContext.resolve = webpackEmptyContext;\n",
				"module.exports = webpackEmptyContext;\n",
				"webpackEmptyContext.id = " + JSON.stringify(this.id) + ";\n"
			];
		}
		if(this.useSourceMap) {
			return new OriginalSource(str.join(""), this.identifier());
		} else {
			return new RawSource(str.join(""));
		}
	}

	size() {
		return this.dependencies.map(function(dep) {
			return dep.userRequest.length + 5;
		}).reduce(function(a, b) {
			return a + b;
		}, 160);
	}
}

module.exports = ContextModule;
