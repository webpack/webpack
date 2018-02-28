/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const path = require("path");
const util = require("util");
const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const AsyncDependenciesBlock = require("./AsyncDependenciesBlock");
const Template = require("./Template");

class ContextModule extends Module {
	// type ContextMode = "sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once"
	// type ContextOptions = { resource: string, recursive: boolean, regExp: RegExp, addon?: string, mode?: ContextMode, chunkName?: string, include?: RegExp, exclude?: RegExp }
	// resolveDependencies: (fs: FS, options: ContextOptions, (err: Error?, dependencies: Dependency[]) => void) => void
	// options: ContextOptions
	constructor(resolveDependencies, options) {
		let resource;
		let resourceQuery;
		const queryIdx = options.resource.indexOf("?");
		if (queryIdx >= 0) {
			resource = options.resource.substr(0, queryIdx);
			resourceQuery = options.resource.substr(queryIdx);
		} else {
			resource = options.resource;
			resourceQuery = "";
		}

		super("javascript/dynamic", resource);

		// Info from Factory
		this.resolveDependencies = resolveDependencies;
		this.options = Object.assign({}, options, {
			resource: resource,
			resourceQuery: resourceQuery
		});
		if (options.resolveOptions !== undefined)
			this.resolveOptions = options.resolveOptions;

		// Info from Build
		this._contextDependencies = new Set([this.context]);

		if (typeof options.mode !== "string")
			throw new Error("options.mode is a required option");
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString.substring(1, regexString.length - 1);
	}

	contextify(context, request) {
		return request
			.split("!")
			.map(subrequest => {
				let rp = path.relative(context, subrequest);
				if (path.sep === "\\") rp = rp.replace(/\\/g, "/");
				if (rp.indexOf("../") !== 0) rp = "./" + rp;
				return rp;
			})
			.join("!");
	}

	identifier() {
		let identifier = this.context;
		if (this.options.resourceQuery)
			identifier += ` ${this.options.resourceQuery}`;
		if (this.options.mode) identifier += ` ${this.options.mode}`;
		if (!this.options.recursive) identifier += " nonrecursive";
		if (this.options.addon) identifier += ` ${this.options.addon}`;
		if (this.options.regExp) identifier += ` ${this.options.regExp}`;
		if (this.options.include) identifier += ` include: ${this.options.include}`;
		if (this.options.exclude) identifier += ` exclude: ${this.options.exclude}`;
		if (this.options.namespaceObject === "strict")
			identifier += " strict namespace object";
		else if (this.options.namespaceObject) identifier += " namespace object";

		return identifier;
	}

	readableIdentifier(requestShortener) {
		let identifier = requestShortener.shorten(this.context);
		if (this.options.resourceQuery)
			identifier += ` ${this.options.resourceQuery}`;
		if (this.options.mode) identifier += ` ${this.options.mode}`;
		if (!this.options.recursive) identifier += " nonrecursive";
		if (this.options.addon)
			identifier += ` ${requestShortener.shorten(this.options.addon)}`;
		if (this.options.regExp)
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		if (this.options.include)
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		if (this.options.exclude)
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;
		if (this.options.namespaceObject === "strict")
			identifier += " strict namespace object";
		else if (this.options.namespaceObject) identifier += " namespace object";

		return identifier;
	}

	libIdent(options) {
		let identifier = this.contextify(options.context, this.context);
		if (this.options.mode) identifier += ` ${this.options.mode}`;
		if (this.options.recursive) identifier += " recursive";
		if (this.options.addon)
			identifier += ` ${this.contextify(options.context, this.options.addon)}`;
		if (this.options.regExp)
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		if (this.options.include)
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		if (this.options.exclude)
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;

		return identifier;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		const ts = contextTimestamps.get(this.context);
		if (!ts) {
			return true;
		}

		return ts >= this.buildInfo.builtTime;
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.buildMeta = {};
		this.buildInfo = {
			builtTime: Date.now(),
			contextDependencies: this._contextDependencies
		};
		this.resolveDependencies(fs, this.options, (err, dependencies) => {
			if (err) return callback(err);

			// abort if something failed
			// this will create an empty context
			if (!dependencies) {
				callback();
				return;
			}

			// enhance dependencies with meta info
			for (const dep of dependencies) {
				dep.loc = dep.userRequest;
				dep.request = this.options.addon + dep.request;
			}

			if (this.options.mode === "sync" || this.options.mode === "eager") {
				// if we have an sync or eager context
				// just add all dependencies and continue
				this.dependencies = dependencies;
			} else if (this.options.mode === "lazy-once") {
				// for the lazy-once mode create a new async dependency block
				// and add that block to this context
				if (dependencies.length > 0) {
					const block = new AsyncDependenciesBlock(
						this.options.chunkName,
						this
					);
					for (const dep of dependencies) {
						block.addDependency(dep);
					}
					this.addBlock(block);
				}
			} else if (
				this.options.mode === "weak" ||
				this.options.mode === "async-weak"
			) {
				// we mark all dependencies as weak
				for (const dep of dependencies) {
					dep.weak = true;
				}
				this.dependencies = dependencies;
			} else if (this.options.mode === "lazy") {
				// if we are lazy create a new async dependency block per dependency
				// and add all blocks to this context
				let index = 0;
				for (const dep of dependencies) {
					let chunkName = this.options.chunkName;
					if (chunkName) {
						if (!/\[(index|request)\]/.test(chunkName)) chunkName += "[index]";
						chunkName = chunkName.replace(/\[index\]/g, index++);
						chunkName = chunkName.replace(
							/\[request\]/g,
							Template.toPath(dep.userRequest)
						);
					}
					const block = new AsyncDependenciesBlock(
						chunkName,
						dep.module,
						dep.loc,
						dep.userRequest
					);
					block.addDependency(dep);
					this.addBlock(block);
				}
			} else {
				callback(
					new Error(`Unsupported mode "${this.options.mode}" in context`)
				);
				return;
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
				if (a.userRequest === b.userRequest) {
					return 0;
				}
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, dep) => {
				map[dep.userRequest] = dep.module.id;
				return map;
			}, Object.create(null));
	}

	getFakeMap(dependencies) {
		if (!this.options.namespaceObject) return 1;
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		let hasNonHarmony = false;
		let hasNamespace = false;
		let hasNamed = false;
		const fakeMap = dependencies
			.filter(dependency => dependency.module)
			.sort((a, b) => {
				return b.module.id - a.module.id;
			})
			.reduce((map, dep) => {
				const exportsType =
					dep.module.buildMeta && dep.module.buildMeta.exportsType;
				if (!exportsType) hasNonHarmony = true;
				if (exportsType === "namespace") hasNamespace = true;
				if (exportsType === "named") hasNamed = true;
				map[dep.module.id] =
					{
						namespace: 1,
						named: 2
					}[exportsType] || 0;
				return map;
			}, Object.create(null));
		if (!hasNamespace && hasNonHarmony && !hasNamed) return 0;
		if (hasNamespace && !hasNonHarmony && !hasNamed) return 1;
		if (!hasNamespace && !hasNonHarmony && hasNamed) return 2;
		if (!hasNamespace && !hasNonHarmony && !hasNamed) return 1;
		return fakeMap;
	}

	getFakeMapInitStatement(fakeMap) {
		return typeof fakeMap === "object"
			? `var fakeMap = ${JSON.stringify(fakeMap, null, "\t")};`
			: "";
	}

	getReturn(type) {
		if (type === 1) return "module";
		if (type === 2)
			return 'Object.assign({/* fake namespace object */}, typeof module === "object" && module, { "default": module })';
		if (type === 0) {
			if (this.options.namespaceObject === "strict") {
				return '/* fake namespace object */ { "default": module }';
			} else {
				return '(typeof module === "object" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === "object" && module, { "default": module }))';
			}
		}
	}

	getReturnModuleObjectSource(fakeMap, fakeMapDataExpression = "fakeMap[id]") {
		if (typeof fakeMap === "number")
			return `return ${this.getReturn(fakeMap)};`;
		return `return ${fakeMapDataExpression} === 1 ? ${this.getReturn(1)} : ${
			fakeMapDataExpression
		} ? ${this.getReturn(2)} : ${this.getReturn(0)};`;
	}

	getSyncSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		const fakeMap = this.getFakeMap(dependencies);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackContext(req) {
	var id = webpackContextResolve(req);
	var module = __webpack_require__(id);
	${returnModuleObject}
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return id;
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = ${JSON.stringify(id)};`;
	}

	getWeakSyncSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		const fakeMap = this.getFakeMap(dependencies);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackContext(req) {
	var id = webpackContextResolve(req);
	if(!__webpack_require__.m[id]) {
		var e = new Error("Module '" + req + "' ('" + id + "') is not available (weak dependency)");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	var module = __webpack_require__(id);
	${returnModuleObject}
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return id;
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
webpackContext.id = ${JSON.stringify(id)};
module.exports = webpackContext;`;
	}

	getAsyncWeakSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		const fakeMap = this.getFakeMap(dependencies);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(function(id) {
		if(!__webpack_require__.m[id]) {
			var e = new Error("Module '" + req + "' ('" + id + "') is not available (weak dependency)");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		var module = __webpack_require__(id);
		${returnModuleObject}
	});
}
function webpackAsyncContextResolve(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var id = map[req];
		if(!(id + 1)) { // check for number or string
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return id;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getEagerSource(dependencies, id) {
		const map = this.getUserRequestMap(dependencies);
		const fakeMap = this.getFakeMap(dependencies);
		const thenFunction =
			fakeMap !== 1
				? `function(id) {
	var module = __webpack_require__(id);
	${this.getReturnModuleObjectSource(fakeMap)}
}`
				: "__webpack_require__";
		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${thenFunction});
}
function webpackAsyncContextResolve(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var id = map[req];
		if(!(id + 1)) { // check for number or string
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return id;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getLazyOnceSource(block, dependencies, id, runtimeTemplate) {
		const promise = runtimeTemplate.blockPromise({
			block,
			message: "lazy-once context"
		});
		const map = this.getUserRequestMap(dependencies);
		const fakeMap = this.getFakeMap(dependencies);
		const thenFunction =
			fakeMap !== 1
				? `function(id) {
		var module = __webpack_require__(id);
		${this.getReturnModuleObjectSource(fakeMap)};
	}`
				: "__webpack_require__";

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${thenFunction});
}
function webpackAsyncContextResolve(req) {
	return ${promise}.then(function() {
		var id = map[req];
		if(!(id + 1)) { // check for number or string
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return id;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getLazySource(blocks, id) {
		let hasMultipleOrNoChunks = false;
		const fakeMap = this.getFakeMap(blocks.map(b => b.dependencies[0]));
		const map = blocks
			.filter(block => block.dependencies[0].module)
			.map(block => ({
				dependency: block.dependencies[0],
				block: block,
				userRequest: block.dependencies[0].userRequest
			}))
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) return 0;
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, item) => {
				const chunks =
					(item.block.chunkGroup && item.block.chunkGroup.chunks) || [];
				if (chunks.length !== 1) {
					hasMultipleOrNoChunks = true;
				}
				const arrayStart = [item.dependency.module.id];
				if (typeof fakeMap === "object")
					arrayStart.push(fakeMap[item.dependency.module.id]);
				map[item.userRequest] = arrayStart.concat(
					chunks.map(chunk => chunk.id)
				);

				return map;
			}, Object.create(null));

		const chunksStartPosition = typeof fakeMap === "object" ? 2 : 1;
		const requestPrefix = hasMultipleOrNoChunks
			? `Promise.all(ids.slice(${
					chunksStartPosition
				}).map(__webpack_require__.e))`
			: `__webpack_require__.e(ids[${chunksStartPosition}])`;
		const returnModuleObject = this.getReturnModuleObjectSource(
			fakeMap,
			"ids[1]"
		);

		return `var map = ${JSON.stringify(map, null, "\t")};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids) {
		return Promise.resolve().then(function() {
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return ${requestPrefix}.then(function() {
		var module = __webpack_require__(ids[0]);
		${returnModuleObject}
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getSourceForEmptyContext(id) {
		return `function webpackEmptyContext(req) {
	var e = new Error('Cannot find module "' + req + '".');
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = ${JSON.stringify(id)};`;
	}

	getSourceForEmptyAsyncContext(id) {
		return `function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = ${JSON.stringify(id)};`;
	}

	getSourceString(asyncMode, runtimeTemplate) {
		if (asyncMode === "lazy") {
			if (this.blocks && this.blocks.length > 0) {
				return this.getLazySource(this.blocks, this.id);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if (asyncMode === "eager") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getEagerSource(this.dependencies, this.id);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if (asyncMode === "lazy-once") {
			const block = this.blocks[0];
			if (block) {
				return this.getLazyOnceSource(
					block,
					block.dependencies,
					this.id,
					runtimeTemplate
				);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if (asyncMode === "async-weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getAsyncWeakSource(this.dependencies, this.id);
			}
			return this.getSourceForEmptyAsyncContext(this.id);
		}
		if (asyncMode === "weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getWeakSyncSource(this.dependencies, this.id);
			}
		}
		if (this.dependencies && this.dependencies.length > 0) {
			return this.getSyncSource(this.dependencies, this.id);
		}
		return this.getSourceForEmptyContext(this.id);
	}

	getSource(sourceString) {
		if (this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}
		return new RawSource(sourceString);
	}

	source(dependencyTemplates, runtimeTemplate) {
		return this.getSource(
			this.getSourceString(this.options.mode, runtimeTemplate)
		);
	}

	size() {
		// base penalty
		const initialSize = 160;

		// if we dont have dependencies we stop here.
		return this.dependencies.reduce(
			(size, dependency) => size + 5 + dependency.userRequest.length,
			initialSize
		);
	}
}

// TODO remove in webpack 5
Object.defineProperty(ContextModule.prototype, "recursive", {
	configurable: false,
	get: util.deprecate(function() {
		return this.options.recursive;
	}, "ContextModule.recursive has been moved to ContextModule.options.recursive"),
	set: util.deprecate(function(value) {
		this.options.recursive = value;
	}, "ContextModule.recursive has been moved to ContextModule.options.recursive")
});

// TODO remove in webpack 5
Object.defineProperty(ContextModule.prototype, "regExp", {
	configurable: false,
	get: util.deprecate(function() {
		return this.options.regExp;
	}, "ContextModule.regExp has been moved to ContextModule.options.regExp"),
	set: util.deprecate(function(value) {
		this.options.regExp = value;
	}, "ContextModule.regExp has been moved to ContextModule.options.regExp")
});

// TODO remove in webpack 5
Object.defineProperty(ContextModule.prototype, "addon", {
	configurable: false,
	get: util.deprecate(function() {
		return this.options.addon;
	}, "ContextModule.addon has been moved to ContextModule.options.addon"),
	set: util.deprecate(function(value) {
		this.options.addon = value;
	}, "ContextModule.addon has been moved to ContextModule.options.addon")
});

// TODO remove in webpack 5
Object.defineProperty(ContextModule.prototype, "async", {
	configurable: false,
	get: util.deprecate(function() {
		return this.options.mode;
	}, "ContextModule.async has been moved to ContextModule.options.mode"),
	set: util.deprecate(function(value) {
		this.options.mode = value;
	}, "ContextModule.async has been moved to ContextModule.options.mode")
});

// TODO remove in webpack 5
Object.defineProperty(ContextModule.prototype, "chunkName", {
	configurable: false,
	get: util.deprecate(function() {
		return this.options.chunkName;
	}, "ContextModule.chunkName has been moved to ContextModule.options.chunkName"),
	set: util.deprecate(function(value) {
		this.options.chunkName = value;
	}, "ContextModule.chunkName has been moved to ContextModule.options.chunkName")
});

module.exports = ContextModule;
