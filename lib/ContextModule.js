/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("./AsyncDependenciesBlock");
const Module = require("./Module");
const Template = require("./Template");
const { compareModulesById } = require("./util/comparators");
const contextify = require("./util/identifier").contextify;

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./dependencies/ContextElementDependency")} ContextElementDependency */

/** @typedef {"sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once"} ContextMode Context mode */

/**
 * @callback ResolveDependenciesCallback
 * @param {Error=} err
 * @param {ContextElementDependency[]} dependencies
 */

/**
 * @callback ResolveDependencies
 * @param {TODO} fs
 * @param {TODO} options
 * @param {ResolveDependenciesCallback} callback
 */

class ContextModule extends Module {
	// type ContextMode = "sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once"
	// type ContextOptions = { resource: string, recursive: boolean, regExp: RegExp, addon?: string, mode?: ContextMode, chunkName?: string, include?: RegExp, exclude?: RegExp, groupOptions?: Object }
	// resolveDependencies: (fs: FS, options: ContextOptions, (err: Error?, dependencies: Dependency[]) => void) => void
	// options: ContextOptions
	/**
	 * @param {ResolveDependencies} resolveDependencies function to get dependencies in this context
	 * @param {TODO} options options object
	 */
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
		if (options.resolveOptions !== undefined) {
			this.resolveOptions = options.resolveOptions;
		}

		// Info from Build
		this._contextDependencies = new Set([this.context]);

		if (typeof options.mode !== "string") {
			throw new Error("options.mode is a required option");
		}

		this._identifier = this._createIdentifier();
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		const m = /** @type {ContextModule} */ (module);
		this.resolveDependencies = m.resolveDependencies;
		this.options = m.options;
		this.resolveOptions = m.resolveOptions;
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString.substring(1, regexString.length - 1);
	}

	_createIdentifier() {
		let identifier = this.context;
		if (this.options.resourceQuery) {
			identifier += ` ${this.options.resourceQuery}`;
		}
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (!this.options.recursive) {
			identifier += " nonrecursive";
		}
		if (this.options.addon) {
			identifier += ` ${this.options.addon}`;
		}
		if (this.options.regExp) {
			identifier += ` ${this.options.regExp}`;
		}
		if (this.options.include) {
			identifier += ` include: ${this.options.include}`;
		}
		if (this.options.exclude) {
			identifier += ` exclude: ${this.options.exclude}`;
		}
		if (this.options.groupOptions) {
			identifier += ` groupOptions: ${JSON.stringify(
				this.options.groupOptions
			)}`;
		}
		if (this.options.namespaceObject === "strict") {
			identifier += " strict namespace object";
		} else if (this.options.namespaceObject) {
			identifier += " namespace object";
		}

		return identifier;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		let identifier = requestShortener.shorten(this.context);
		if (this.options.resourceQuery) {
			identifier += ` ${this.options.resourceQuery}`;
		}
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (!this.options.recursive) {
			identifier += " nonrecursive";
		}
		if (this.options.addon) {
			identifier += ` ${requestShortener.shorten(this.options.addon)}`;
		}
		if (this.options.regExp) {
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		}
		if (this.options.include) {
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		}
		if (this.options.exclude) {
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;
		}
		if (this.options.groupOptions) {
			const groupOptions = this.options.groupOptions;
			for (const key of Object.keys(groupOptions)) {
				identifier += ` ${key}: ${groupOptions[key]}`;
			}
		}
		if (this.options.namespaceObject === "strict") {
			identifier += " strict namespace object";
		} else if (this.options.namespaceObject) {
			identifier += " namespace object";
		}

		return identifier;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		let identifier = contextify(options.context, this.context);
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (this.options.recursive) {
			identifier += " recursive";
		}
		if (this.options.addon) {
			identifier += ` ${contextify(options.context, this.options.addon)}`;
		}
		if (this.options.regExp) {
			identifier += ` ${this.prettyRegExp(this.options.regExp + "")}`;
		}
		if (this.options.include) {
			identifier += ` include: ${this.prettyRegExp(this.options.include + "")}`;
		}
		if (this.options.exclude) {
			identifier += ` exclude: ${this.prettyRegExp(this.options.exclude + "")}`;
		}

		return identifier;
	}

	/**
	 * @param {TODO} fileTimestamps timestamps of files
	 * @param {TODO} contextTimestamps timestamps of directories
	 * @returns {boolean} true, if the module needs a rebuild
	 */
	needRebuild(fileTimestamps, contextTimestamps) {
		const ts = contextTimestamps.get(this.context);
		if (!ts) {
			return true;
		}

		return ts >= this.buildInfo.builtTime;
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(Error=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
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
				dep.loc = {
					name: dep.userRequest
				};
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
						Object.assign({}, this.options.groupOptions, {
							name: this.options.chunkName
						}),
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
						if (!/\[(index|request)\]/.test(chunkName)) {
							chunkName += "[index]";
						}
						chunkName = chunkName.replace(/\[index\]/g, index++);
						chunkName = chunkName.replace(
							/\[request\]/g,
							Template.toPath(dep.userRequest)
						);
					}
					const block = new AsyncDependenciesBlock(
						Object.assign({}, this.options.groupOptions, {
							name: chunkName
						}),
						compilation.moduleGraph.getModule(dep),
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

	/**
	 * @param {ContextElementDependency[]} dependencies all dependencies
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {TODO} TODO
	 */
	getUserRequestMap(dependencies, chunkGraph) {
		const moduleGraph = chunkGraph.moduleGraph;
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		return dependencies
			.filter(dependency => moduleGraph.getModule(dependency))
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) {
					return 0;
				}
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, dep) => {
				const module = moduleGraph.getModule(dep);
				map[dep.userRequest] = chunkGraph.getModuleId(module);
				return map;
			}, Object.create(null));
	}

	/**
	 * @param {ContextElementDependency[]} dependencies all dependencies
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {TODO} TODO
	 */
	getFakeMap(dependencies, chunkGraph) {
		if (!this.options.namespaceObject) {
			return 9;
		}
		const moduleGraph = chunkGraph.moduleGraph;
		// if we filter first we get a new array
		// therefor we dont need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		let hasNonHarmony = false;
		let hasNamespace = false;
		let hasNamed = false;
		const comparator = compareModulesById(chunkGraph);
		const fakeMap = dependencies
			.map(dependency => ({
				module: moduleGraph.getModule(dependency),
				dependency
			}))
			.filter(item => item.module)
			.sort((a, b) => comparator(a.module, b.module))
			.reduce((map, { dependency: dep, module }) => {
				const exportsType = module.buildMeta && module.buildMeta.exportsType;
				const id = chunkGraph.getModuleId(module);
				if (!exportsType) {
					map[id] = this.options.namespaceObject === "strict" ? 1 : 7;
					hasNonHarmony = true;
				} else if (exportsType === "namespace") {
					map[id] = 9;
					hasNamespace = true;
				} else if (exportsType === "named") {
					map[id] = 3;
					hasNamed = true;
				}
				return map;
			}, Object.create(null));
		if (!hasNamespace && hasNonHarmony && !hasNamed) {
			return this.options.namespaceObject === "strict" ? 1 : 7;
		}
		if (hasNamespace && !hasNonHarmony && !hasNamed) {
			return 9;
		}
		if (!hasNamespace && !hasNonHarmony && hasNamed) {
			return 3;
		}
		if (!hasNamespace && !hasNonHarmony && !hasNamed) {
			return 9;
		}
		return fakeMap;
	}

	getFakeMapInitStatement(fakeMap) {
		return typeof fakeMap === "object"
			? `var fakeMap = ${JSON.stringify(fakeMap, null, "\t")};`
			: "";
	}

	getReturn(type) {
		if (type === 9) {
			return "__webpack_require__(id)";
		}
		return `__webpack_require__.t(id, ${type})`;
	}

	getReturnModuleObjectSource(fakeMap, fakeMapDataExpression = "fakeMap[id]") {
		if (typeof fakeMap === "number") {
			return `return ${this.getReturn(fakeMap)};`;
		}
		return `return __webpack_require__.t(id, ${fakeMapDataExpression})`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getSyncSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackContext(req) {
	var id = webpackContextResolve(req);
	${returnModuleObject}
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error("Cannot find module '" + req + "'");
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

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getWeakSyncSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
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
	${returnModuleObject}
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error("Cannot find module '" + req + "'");
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

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getAsyncWeakSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
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
		${returnModuleObject}
	});
}
function webpackAsyncContextResolve(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var id = map[req];
		if(!(id + 1)) { // check for number or string
			var e = new Error("Cannot find module '" + req + "'");
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

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getEagerSource(dependencies, id, chunkGraph) {
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `function(id) {
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
			var e = new Error("Cannot find module '" + req + "'");
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

	/**
	 * @param {TODO} block TODO
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {Object} options options object
	 * @param {RuntimeTemplate} options.runtimeTemplate the runtime template
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getLazyOnceSource(block, dependencies, id, { runtimeTemplate, chunkGraph }) {
		const promise = runtimeTemplate.blockPromise({
			chunkGraph,
			block,
			message: "lazy-once context"
		});
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `function(id) {
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
			var e = new Error("Cannot find module '" + req + "'");
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

	/**
	 * @param {TODO} blocks TODO
	 * @param {TODO} id TODO
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string} source code
	 */
	getLazySource(blocks, id, chunkGraph) {
		const moduleGraph = chunkGraph.moduleGraph;
		let hasMultipleOrNoChunks = false;
		const fakeMap = this.getFakeMap(
			blocks.map(b => b.dependencies[0]),
			chunkGraph
		);
		const map = blocks
			.map(block => {
				const dependency = block.dependencies[0];
				return {
					dependency: dependency,
					module: moduleGraph.getModule(dependency),
					block: block,
					userRequest: dependency.userRequest
				};
			})
			.filter(item => item.module)
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) return 0;
				return a.userRequest < b.userRequest ? -1 : 1;
			})
			.reduce((map, item) => {
				const chunkGroup = chunkGraph.getBlockChunkGroup(item.block);
				const chunks = (chunkGroup && chunkGroup.chunks) || [];
				if (chunks.length !== 1) {
					hasMultipleOrNoChunks = true;
				}
				const module = moduleGraph.getModule(item.dependency);
				const moduleId = chunkGraph.getModuleId(module);
				const arrayStart = [moduleId];
				if (typeof fakeMap === "object") {
					arrayStart.push(fakeMap[moduleId]);
				}
				map[item.userRequest] = arrayStart.concat(
					chunks.map(chunk => chunk.id)
				);

				return map;
			}, Object.create(null));

		const chunksStartPosition = typeof fakeMap === "object" ? 2 : 1;
		const requestPrefix = hasMultipleOrNoChunks
			? `Promise.all(ids.slice(${chunksStartPosition}).map(__webpack_require__.e))`
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
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return ${requestPrefix}.then(function() {
		var id = ids[0];
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
	var e = new Error("Cannot find module '" + req + "'");
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
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = ${JSON.stringify(id)};`;
	}

	/**
	 * @param {string} asyncMode module mode
	 * @param {SourceContext} sourceContext context info
	 * @returns {string} the source code
	 */
	getSourceString(asyncMode, { runtimeTemplate, chunkGraph }) {
		const id = chunkGraph.getModuleId(this);
		if (asyncMode === "lazy") {
			if (this.blocks && this.blocks.length > 0) {
				return this.getLazySource(this.blocks, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "eager") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getEagerSource(this.dependencies, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "lazy-once") {
			const block = this.blocks[0];
			if (block) {
				return this.getLazyOnceSource(block, block.dependencies, id, {
					runtimeTemplate,
					chunkGraph
				});
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "async-weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getAsyncWeakSource(this.dependencies, id, chunkGraph);
			}
			return this.getSourceForEmptyAsyncContext(id);
		}
		if (asyncMode === "weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getWeakSyncSource(this.dependencies, id, chunkGraph);
			}
		}
		if (this.dependencies && this.dependencies.length > 0) {
			return this.getSyncSource(this.dependencies, id, chunkGraph);
		}
		return this.getSourceForEmptyContext(id);
	}

	getSource(sourceString) {
		if (this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}
		return new RawSource(sourceString);
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		return this.getSource(
			this.getSourceString(this.options.mode, sourceContext)
		);
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		// base penalty
		const initialSize = 160;

		// if we dont have dependencies we stop here.
		return this.dependencies.reduce((size, dependency) => {
			const element = /** @type {ContextElementDependency} */ (dependency);
			return size + 5 + element.userRequest.length;
		}, initialSize);
	}
}

module.exports = ContextModule;
