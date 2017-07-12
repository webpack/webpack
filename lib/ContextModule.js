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
const DepBlockHelpers = require("./dependencies/DepBlockHelpers");
const Template = require("./Template");

class ContextModule extends Module {
	constructor(resolveDependencies, context, recursive, regExp, addon, asyncMode, chunkName) {
		super();
		this.resolveDependencies = resolveDependencies;
		this.context = context;
		this.recursive = recursive;
		this.regExp = regExp;
		this.addon = addon;
		this.async = asyncMode;
		this.cacheable = true;
		this.contextDependencies = [context];
		this.built = false;
		this.chunkName = chunkName;
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString.substring(1, regexString.length - 1);
	}

	contextify(context, request) {
		return request.split("!").map(subrequest => {
			let rp = path.relative(context, subrequest);
			if(path.sep === "\\")
				rp = rp.replace(/\\/g, "/");
			if(rp.indexOf("../") !== 0)
				rp = "./" + rp;
			return rp;
		}).join("!");
	}

	identifier() {
		let identifier = this.context;
		if(this.async)
			identifier += ` ${this.async}`;
		if(!this.recursive)
			identifier += " nonrecursive";
		if(this.addon)
			identifier += ` ${this.addon}`;
		if(this.regExp)
			identifier += ` ${this.regExp}`;

		return identifier;
	}

	readableIdentifier(requestShortener) {
		let identifier = requestShortener.shorten(this.context);
		if(this.async)
			identifier += ` ${this.async}`;
		if(!this.recursive)
			identifier += " nonrecursive";
		if(this.addon)
			identifier += ` ${requestShortener.shorten(this.addon)}`;
		if(this.regExp)
			identifier += ` ${this.prettyRegExp(this.regExp + "")}`;

		return identifier;
	}

	libIdent(options) {
		let identifier = this.contextify(options.context, this.context);
		if(this.async)
			identifier += ` ${this.async}`;
		if(this.recursive)
			identifier += " recursive";
		if(this.addon)
			identifier += ` ${this.contextify(options.context, this.addon)}`;
		if(this.regExp)
			identifier += ` ${this.prettyRegExp(this.regExp + "")}`;

		return identifier;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		const ts = contextTimestamps[this.context];
		if(!ts) {
			return true;
		}

		return ts >= this.builtTime;
	}

	unbuild() {
		this.built = false;
		super.unbuild();
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.builtTime = Date.now();
		this.resolveDependencies(fs, this.context, this.recursive, this.regExp, (err, dependencies) => {
			if(err) return callback(err);

			// Reset children
			this.dependencies = [];
			this.blocks = [];

			// abort if something failed
			// this will create an empty context
			if(!dependencies) {
				callback();
				return;
			}

			// enhance dependencies with meta info
			dependencies.forEach(dep => {
				dep.loc = dep.userRequest;
				dep.request = this.addon + dep.request;
			});

			if(!this.async || this.async === "eager") {

				// if we have an sync or eager context
				// just add all dependencies and continue
				this.dependencies = dependencies;

			} else if(this.async === "lazy-once") {

				// for the lazy-once mode create a new async dependency block
				// and add that block to this context
				if(dependencies.length > 0) {
					const block = new AsyncDependenciesBlock(this.chunkName, this);
					dependencies.forEach(dep => {
						block.addDependency(dep);
					});
					this.addBlock(block);
				}

			} else {

				// if we are lazy create a new async dependency block per dependency
				// and add all blocks to this context
				dependencies.forEach((dep, idx) => {
					let chunkName = this.chunkName;
					if(chunkName) {
						if(!/\[(index|request)\]/.test(chunkName))
							chunkName += "[index]";
						chunkName = chunkName.replace(/\[index\]/g, idx);
						chunkName = chunkName.replace(/\[request\]/g, Template.toPath(dep.userRequest));
					}
					const block = new AsyncDependenciesBlock(chunkName, dep.module, dep.loc);
					block.addDependency(dep);
					this.addBlock(block);
				});
			}
			callback();
		});
	}

	getUserRequestMap(dependencies) {
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		return dependencies
			.filter(dependency => dependency.module)
			.sort((a, b) => {
				if(a.userRequest === b.userRequest) {
					return 0;
				}
				return a.userRequest < b.userRequest ? -1 : 1;
			}).reduce(function(map, dep) {
				map[dep.userRequest] = dep.module.id;
				return map;
			}, Object.create(null));
	}

	getSyncSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		return `var map = ${JSON.stringify(map, null, "\t")};
function webpackContext(req) {
	return __webpack_require__(webpackContextResolve(req));
};
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) // check for number or string
		throw new Error("Cannot find module '" + req + "'.");
	return id;
};
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = ${JSON.stringify(id)};`;
	}

	getEagerSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		return `var map = ${JSON.stringify(map, null, "\t")};
function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(__webpack_require__);
};
function webpackAsyncContextResolve(req) {
	return new Promise(function(resolve, reject) {
		var id = map[req];
		if(!(id + 1)) // check for number or string
			reject(new Error("Cannot find module '" + req + "'."));
		else
			resolve(id);
	});
};
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
module.exports = webpackAsyncContext;
webpackAsyncContext.id = ${JSON.stringify(id)};`;
	}

	getLazyOnceSource(block, dependencies, id, outputOptions, requestShortener) {
		const promise = DepBlockHelpers.getDepBlockPromise(block, outputOptions, requestShortener, "lazy-once context");
		const map = this.getUserRequestMap(dependencies);
		return `var map = ${JSON.stringify(map, null, "\t")};
function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(__webpack_require__);
};
function webpackAsyncContextResolve(req) {
	return ${promise}.then(function() {
		var id = map[req];
		if(!(id + 1)) // check for number or string
			throw new Error("Cannot find module '" + req + "'.");
		return id;
	});
};
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
module.exports = webpackAsyncContext;
webpackAsyncContext.id = ${JSON.stringify(id)};`;
	}

	getLazySource(blocks, id) {
		let hasMultipleOrNoChunks = false;
		const map = blocks
			.filter(block => block.dependencies[0].module)
			.map((block) => ({
				dependency: block.dependencies[0],
				block: block,
				userRequest: block.dependencies[0].userRequest
			})).sort((a, b) => {
				if(a.userRequest === b.userRequest) return 0;
				return a.userRequest < b.userRequest ? -1 : 1;
			}).reduce((map, item) => {
				const chunks = item.block.chunks || [];
				if(chunks.length !== 1) {
					hasMultipleOrNoChunks = true;
				}
				map[item.userRequest] = [item.dependency.module.id]
					.concat(chunks.map(chunk => chunk.id));

				return map;
			}, Object.create(null));

		const requestPrefix = hasMultipleOrNoChunks ?
			"Promise.all(ids.slice(1).map(__webpack_require__.e))" :
			"__webpack_require__.e(ids[1])";

		return `var map = ${JSON.stringify(map, null, "\t")};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids)
		return Promise.reject(new Error("Cannot find module '" + req + "'."));
	return ${requestPrefix}.then(function() {
		return __webpack_require__(ids[0]);
	});
};
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
module.exports = webpackAsyncContext;
webpackAsyncContext.id = ${JSON.stringify(id)};`;
	}

	getSourceForEmptyContext(id) {
		return `function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = ${JSON.stringify(id)};`;
	}

	getSourceForEmptyAsyncContext(id) {
		return `function webpackEmptyAsyncContext(req) {
	return new Promise(function(resolve, reject) { reject(new Error("Cannot find module '" + req + "'.")); });
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = ${JSON.stringify(id)};`;
	}

	getSourceString(asyncMode, outputOptions, requestShortener) {
		if(asyncMode === "lazy") {
			if(this.blocks && this.blocks.length > 0) {
				return this.getLazySource(this.blocks, this.id);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if(asyncMode === "eager") {
			if(this.dependencies && this.dependencies.length > 0) {
				return this.getEagerSource(this.dependencies, this.id);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		} else if(asyncMode === "lazy-once") {
			const block = this.blocks[0];
			if(block) {
				return this.getLazyOnceSource(block, block.dependencies, this.id, outputOptions, requestShortener);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if(this.dependencies && this.dependencies.length > 0) {
			return this.getSyncSource(this.dependencies, this.id);
		}
		return this.getSourceForEmptyContext(this.id);
	}

	getSource(sourceString) {
		if(this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}
		return new RawSource(sourceString);
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		return this.getSource(
			this.getSourceString(this.async, outputOptions, requestShortener)
		);
	}

	size() {
		// base penalty
		const initialSize = 160;

		// if we dont have dependencies we stop here.
		return this.dependencies
			.reduce((size, dependency) => size + 5 + dependency.userRequest.length, initialSize);
	}
}

module.exports = ContextModule;
