/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("./AsyncDependenciesBlock");
const { makeWebpackError } = require("./HookWebpackError");
const Module = require("./Module");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const WebpackError = require("./WebpackError");
const {
	compareLocations,
	concatComparators,
	compareSelect,
	keepOriginalOrder,
	compareModulesById
} = require("./util/comparators");
const { contextify, parseResource } = require("./util/identifier");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").BuildMeta} BuildMeta */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./dependencies/ContextElementDependency")} ContextElementDependency */
/** @template T @typedef {import("./util/LazySet")<T>} LazySet<T> */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/** @typedef {"sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once"} ContextMode Context mode */

/**
 * @typedef {Object} ContextOptions
 * @property {ContextMode} mode
 * @property {boolean} recursive
 * @property {RegExp} regExp
 * @property {"strict"|boolean=} namespaceObject
 * @property {string=} addon
 * @property {string=} chunkName
 * @property {RegExp=} include
 * @property {RegExp=} exclude
 * @property {RawChunkGroupOptions=} groupOptions
 * @property {string=} typePrefix
 * @property {string=} category
 * @property {string[][]=} referencedExports exports referenced from modules (won't be mangled)
 */

/**
 * @typedef {Object} ContextModuleOptionsExtras
 * @property {string} resource
 * @property {string=} resourceQuery
 * @property {string=} resourceFragment
 * @property {TODO} resolveOptions
 */

/** @typedef {ContextOptions & ContextModuleOptionsExtras} ContextModuleOptions */

/**
 * @callback ResolveDependenciesCallback
 * @param {Error=} err
 * @param {ContextElementDependency[]=} dependencies
 */

/**
 * @callback ResolveDependencies
 * @param {InputFileSystem} fs
 * @param {ContextModuleOptions} options
 * @param {ResolveDependenciesCallback} callback
 */

const SNAPSHOT_OPTIONS = { timestamp: true };

const TYPES = new Set(["javascript"]);

class ContextModule extends Module {
	/**
	 * @param {ResolveDependencies} resolveDependencies function to get dependencies in this context
	 * @param {ContextModuleOptions} options options object
	 */
	constructor(resolveDependencies, options) {
		const parsed = parseResource(options ? options.resource : "");
		const resource = parsed.path;
		const resourceQuery = (options && options.resourceQuery) || parsed.query;
		const resourceFragment =
			(options && options.resourceFragment) || parsed.fragment;

		super("javascript/dynamic", resource);

		// Info from Factory
		this.resolveDependencies = resolveDependencies;
		/** @type {ContextModuleOptions} */
		this.options = {
			...options,
			resource,
			resourceQuery,
			resourceFragment
		};
		if (options && options.resolveOptions !== undefined) {
			this.resolveOptions = options.resolveOptions;
		}

		if (options && typeof options.mode !== "string") {
			throw new Error("options.mode is a required option");
		}

		this._identifier = this._createIdentifier();
		this._forceBuild = true;
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
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
	}

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache() {
		super.cleanupForCache();
		this.resolveDependencies = undefined;
	}

	prettyRegExp(regexString) {
		// remove the "/" at the front and the beginning
		// "/foo/" -> "foo"
		return regexString
			.substring(1, regexString.length - 1)
			.replace(/!/g, "%21");
	}

	_createIdentifier() {
		let identifier = this.context;
		if (this.options.resourceQuery) {
			identifier += `|${this.options.resourceQuery}`;
		}
		if (this.options.resourceFragment) {
			identifier += `|${this.options.resourceFragment}`;
		}
		if (this.options.mode) {
			identifier += `|${this.options.mode}`;
		}
		if (!this.options.recursive) {
			identifier += "|nonrecursive";
		}
		if (this.options.addon) {
			identifier += `|${this.options.addon}`;
		}
		if (this.options.regExp) {
			identifier += `|${this.options.regExp}`;
		}
		if (this.options.include) {
			identifier += `|include: ${this.options.include}`;
		}
		if (this.options.exclude) {
			identifier += `|exclude: ${this.options.exclude}`;
		}
		if (this.options.referencedExports) {
			identifier += `|referencedExports: ${JSON.stringify(
				this.options.referencedExports
			)}`;
		}
		if (this.options.chunkName) {
			identifier += `|chunkName: ${this.options.chunkName}`;
		}
		if (this.options.groupOptions) {
			identifier += `|groupOptions: ${JSON.stringify(
				this.options.groupOptions
			)}`;
		}
		if (this.options.namespaceObject === "strict") {
			identifier += "|strict namespace object";
		} else if (this.options.namespaceObject) {
			identifier += "|namespace object";
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
		let identifier = requestShortener.shorten(this.context) + "/";
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
		if (this.options.referencedExports) {
			identifier += ` referencedExports: ${this.options.referencedExports
				.map(e => e.join("."))
				.join(", ")}`;
		}
		if (this.options.chunkName) {
			identifier += ` chunkName: ${this.options.chunkName}`;
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
		let identifier = contextify(
			options.context,
			this.context,
			options.associatedObjectForCache
		);
		if (this.options.mode) {
			identifier += ` ${this.options.mode}`;
		}
		if (this.options.recursive) {
			identifier += " recursive";
		}
		if (this.options.addon) {
			identifier += ` ${contextify(
				options.context,
				this.options.addon,
				options.associatedObjectForCache
			)}`;
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
		if (this.options.referencedExports) {
			identifier += ` referencedExports: ${this.options.referencedExports
				.map(e => e.join("."))
				.join(", ")}`;
		}

		return identifier;
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		this._forceBuild = true;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild({ fileSystemInfo }, callback) {
		// build if enforced
		if (this._forceBuild) return callback(null, true);

		// always build when we have no snapshot
		if (!this.buildInfo.snapshot) return callback(null, true);

		fileSystemInfo.checkSnapshotValid(this.buildInfo.snapshot, (err, valid) => {
			callback(err, !valid);
		});
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this._forceBuild = false;
		/** @type {BuildMeta} */
		this.buildMeta = {
			exportsType: "default",
			defaultObject: "redirect-warn"
		};
		this.buildInfo = {
			snapshot: undefined
		};
		this.dependencies.length = 0;
		this.blocks.length = 0;
		const startTime = Date.now();
		this.resolveDependencies(fs, this.options, (err, dependencies) => {
			if (err) {
				return callback(
					makeWebpackError(err, "ContextModule.resolveDependencies")
				);
			}

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
			dependencies.sort(
				concatComparators(
					compareSelect(a => a.loc, compareLocations),
					keepOriginalOrder(this.dependencies)
				)
			);

			if (this.options.mode === "sync" || this.options.mode === "eager") {
				// if we have an sync or eager context
				// just add all dependencies and continue
				this.dependencies = dependencies;
			} else if (this.options.mode === "lazy-once") {
				// for the lazy-once mode create a new async dependency block
				// and add that block to this context
				if (dependencies.length > 0) {
					const block = new AsyncDependenciesBlock({
						...this.options.groupOptions,
						name: this.options.chunkName
					});
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
						chunkName = chunkName.replace(/\[index\]/g, `${index++}`);
						chunkName = chunkName.replace(
							/\[request\]/g,
							Template.toPath(dep.userRequest)
						);
					}
					const block = new AsyncDependenciesBlock(
						{
							...this.options.groupOptions,
							name: chunkName
						},
						dep.loc,
						dep.userRequest
					);
					block.addDependency(dep);
					this.addBlock(block);
				}
			} else {
				callback(
					new WebpackError(`Unsupported mode "${this.options.mode}" in context`)
				);
				return;
			}
			compilation.fileSystemInfo.createSnapshot(
				startTime,
				null,
				[this.context],
				null,
				SNAPSHOT_OPTIONS,
				(err, snapshot) => {
					if (err) return callback(err);
					this.buildInfo.snapshot = snapshot;
					callback();
				}
			);
		});
	}

	/**
	 * @param {LazySet<string>} fileDependencies set where file dependencies are added to
	 * @param {LazySet<string>} contextDependencies set where context dependencies are added to
	 * @param {LazySet<string>} missingDependencies set where missing dependencies are added to
	 * @param {LazySet<string>} buildDependencies set where build dependencies are added to
	 */
	addCacheDependencies(
		fileDependencies,
		contextDependencies,
		missingDependencies,
		buildDependencies
	) {
		contextDependencies.add(this.context);
	}

	/**
	 * @param {ContextElementDependency[]} dependencies all dependencies
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {TODO} TODO
	 */
	getUserRequestMap(dependencies, chunkGraph) {
		const moduleGraph = chunkGraph.moduleGraph;
		// if we filter first we get a new array
		// therefore we don't need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		const sortedDependencies = dependencies
			.filter(dependency => moduleGraph.getModule(dependency))
			.sort((a, b) => {
				if (a.userRequest === b.userRequest) {
					return 0;
				}
				return a.userRequest < b.userRequest ? -1 : 1;
			});
		const map = Object.create(null);
		for (const dep of sortedDependencies) {
			const module = moduleGraph.getModule(dep);
			map[dep.userRequest] = chunkGraph.getModuleId(module);
		}
		return map;
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
		// bitfield
		let hasType = 0;
		const comparator = compareModulesById(chunkGraph);
		// if we filter first we get a new array
		// therefore we don't need to create a clone of dependencies explicitly
		// therefore the order of this is !important!
		const sortedModules = dependencies
			.map(dependency => moduleGraph.getModule(dependency))
			.filter(Boolean)
			.sort(comparator);
		const fakeMap = Object.create(null);
		for (const module of sortedModules) {
			const exportsType = module.getExportsType(
				moduleGraph,
				this.options.namespaceObject === "strict"
			);
			const id = chunkGraph.getModuleId(module);
			switch (exportsType) {
				case "namespace":
					fakeMap[id] = 9;
					hasType |= 1;
					break;
				case "dynamic":
					fakeMap[id] = 7;
					hasType |= 2;
					break;
				case "default-only":
					fakeMap[id] = 1;
					hasType |= 4;
					break;
				case "default-with-named":
					fakeMap[id] = 3;
					hasType |= 8;
					break;
				default:
					throw new Error(`Unexpected exports type ${exportsType}`);
			}
		}
		if (hasType === 1) {
			return 9;
		}
		if (hasType === 2) {
			return 7;
		}
		if (hasType === 4) {
			return 1;
		}
		if (hasType === 8) {
			return 3;
		}
		if (hasType === 0) {
			return 9;
		}
		return fakeMap;
	}

	getFakeMapInitStatement(fakeMap) {
		return typeof fakeMap === "object"
			? `var fakeMap = ${JSON.stringify(fakeMap, null, "\t")};`
			: "";
	}

	getReturn(type, asyncModule) {
		if (type === 9) {
			return "__webpack_require__(id)";
		}
		return `${RuntimeGlobals.createFakeNamespaceObject}(id, ${type}${
			asyncModule ? " | 16" : ""
		})`;
	}

	getReturnModuleObjectSource(
		fakeMap,
		asyncModule,
		fakeMapDataExpression = "fakeMap[id]"
	) {
		if (typeof fakeMap === "number") {
			return `return ${this.getReturn(fakeMap, asyncModule)};`;
		}
		return `return ${
			RuntimeGlobals.createFakeNamespaceObject
		}(id, ${fakeMapDataExpression}${asyncModule ? " | 16" : ""})`;
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
	if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
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
	if(!${RuntimeGlobals.moduleFactories}[id]) {
		var e = new Error("Module '" + req + "' ('" + id + "') is not available (weak dependency)");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	${returnModuleObject}
}
function webpackContextResolve(req) {
	if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
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
	 * @param {Object} context context
	 * @param {ChunkGraph} context.chunkGraph the chunk graph
	 * @param {RuntimeTemplate} context.runtimeTemplate the chunk graph
	 * @returns {string} source code
	 */
	getAsyncWeakSource(dependencies, id, { chunkGraph, runtimeTemplate }) {
		const arrow = runtimeTemplate.supportsArrowFunction();
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const returnModuleObject = this.getReturnModuleObjectSource(fakeMap, true);

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${
		arrow ? "id =>" : "function(id)"
	} {
		if(!${RuntimeGlobals.moduleFactories}[id]) {
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
	return Promise.resolve().then(${arrow ? "() =>" : "function()"} {
		if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = ${runtimeTemplate.returningFunction(
			"Object.keys(map)"
		)};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	/**
	 * @param {TODO} dependencies TODO
	 * @param {TODO} id TODO
	 * @param {Object} context context
	 * @param {ChunkGraph} context.chunkGraph the chunk graph
	 * @param {RuntimeTemplate} context.runtimeTemplate the chunk graph
	 * @returns {string} source code
	 */
	getEagerSource(dependencies, id, { chunkGraph, runtimeTemplate }) {
		const arrow = runtimeTemplate.supportsArrowFunction();
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `${arrow ? "id =>" : "function(id)"} {
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
	return Promise.resolve().then(${arrow ? "() =>" : "function()"} {
		if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = ${runtimeTemplate.returningFunction(
			"Object.keys(map)"
		)};
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
			message: "lazy-once context",
			runtimeRequirements: new Set()
		});
		const arrow = runtimeTemplate.supportsArrowFunction();
		const map = this.getUserRequestMap(dependencies, chunkGraph);
		const fakeMap = this.getFakeMap(dependencies, chunkGraph);
		const thenFunction =
			fakeMap !== 9
				? `${arrow ? "id =>" : "function(id)"} {
		${this.getReturnModuleObjectSource(fakeMap, true)};
	}`
				: "__webpack_require__";

		return `var map = ${JSON.stringify(map, null, "\t")};
${this.getFakeMapInitStatement(fakeMap)}

function webpackAsyncContext(req) {
	return webpackAsyncContextResolve(req).then(${thenFunction});
}
function webpackAsyncContextResolve(req) {
	return ${promise}.then(${arrow ? "() =>" : "function()"} {
		if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}
		return map[req];
	});
}
webpackAsyncContext.keys = ${runtimeTemplate.returningFunction(
			"Object.keys(map)"
		)};
webpackAsyncContext.resolve = webpackAsyncContextResolve;
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	/**
	 * @param {TODO} blocks TODO
	 * @param {TODO} id TODO
	 * @param {Object} context context
	 * @param {ChunkGraph} context.chunkGraph the chunk graph
	 * @param {RuntimeTemplate} context.runtimeTemplate the chunk graph
	 * @returns {string} source code
	 */
	getLazySource(blocks, id, { chunkGraph, runtimeTemplate }) {
		const moduleGraph = chunkGraph.moduleGraph;
		const arrow = runtimeTemplate.supportsArrowFunction();
		let hasMultipleOrNoChunks = false;
		let hasNoChunk = true;
		const fakeMap = this.getFakeMap(
			blocks.map(b => b.dependencies[0]),
			chunkGraph
		);
		const hasFakeMap = typeof fakeMap === "object";
		const items = blocks
			.map(block => {
				const dependency = block.dependencies[0];
				return {
					dependency: dependency,
					module: moduleGraph.getModule(dependency),
					block: block,
					userRequest: dependency.userRequest,
					chunks: undefined
				};
			})
			.filter(item => item.module);
		for (const item of items) {
			const chunkGroup = chunkGraph.getBlockChunkGroup(item.block);
			const chunks = (chunkGroup && chunkGroup.chunks) || [];
			item.chunks = chunks;
			if (chunks.length > 0) {
				hasNoChunk = false;
			}
			if (chunks.length !== 1) {
				hasMultipleOrNoChunks = true;
			}
		}
		const shortMode = hasNoChunk && !hasFakeMap;
		const sortedItems = items.sort((a, b) => {
			if (a.userRequest === b.userRequest) return 0;
			return a.userRequest < b.userRequest ? -1 : 1;
		});
		const map = Object.create(null);
		for (const item of sortedItems) {
			const moduleId = chunkGraph.getModuleId(item.module);
			if (shortMode) {
				map[item.userRequest] = moduleId;
			} else {
				const arrayStart = [moduleId];
				if (hasFakeMap) {
					arrayStart.push(fakeMap[moduleId]);
				}
				map[item.userRequest] = arrayStart.concat(
					item.chunks.map(chunk => chunk.id)
				);
			}
		}

		const chunksStartPosition = hasFakeMap ? 2 : 1;
		const requestPrefix = hasNoChunk
			? "Promise.resolve()"
			: hasMultipleOrNoChunks
			? `Promise.all(ids.slice(${chunksStartPosition}).map(${RuntimeGlobals.ensureChunk}))`
			: `${RuntimeGlobals.ensureChunk}(ids[${chunksStartPosition}])`;
		const returnModuleObject = this.getReturnModuleObjectSource(
			fakeMap,
			true,
			shortMode ? "invalid" : "ids[1]"
		);

		const webpackAsyncContext =
			requestPrefix === "Promise.resolve()"
				? `
function webpackAsyncContext(req) {
	return Promise.resolve().then(${arrow ? "() =>" : "function()"} {
		if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}

		${shortMode ? "var id = map[req];" : "var ids = map[req], id = ids[0];"}
		${returnModuleObject}
	});
}`
				: `function webpackAsyncContext(req) {
	if(!${RuntimeGlobals.hasOwnProperty}(map, req)) {
		return Promise.resolve().then(${arrow ? "() =>" : "function()"} {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return ${requestPrefix}.then(${arrow ? "() =>" : "function()"} {
		${returnModuleObject}
	});
}`;

		return `var map = ${JSON.stringify(map, null, "\t")};
${webpackAsyncContext}
webpackAsyncContext.keys = ${runtimeTemplate.returningFunction(
			"Object.keys(map)"
		)};
webpackAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackAsyncContext;`;
	}

	getSourceForEmptyContext(id, runtimeTemplate) {
		return `function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = ${runtimeTemplate.returningFunction("[]")};
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = ${JSON.stringify(id)};
module.exports = webpackEmptyContext;`;
	}

	getSourceForEmptyAsyncContext(id, runtimeTemplate) {
		const arrow = runtimeTemplate.supportsArrowFunction();
		return `function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(${arrow ? "() =>" : "function()"} {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = ${runtimeTemplate.returningFunction("[]")};
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = ${JSON.stringify(id)};
module.exports = webpackEmptyAsyncContext;`;
	}

	/**
	 * @param {string} asyncMode module mode
	 * @param {CodeGenerationContext} context context info
	 * @returns {string} the source code
	 */
	getSourceString(asyncMode, { runtimeTemplate, chunkGraph }) {
		const id = chunkGraph.getModuleId(this);
		if (asyncMode === "lazy") {
			if (this.blocks && this.blocks.length > 0) {
				return this.getLazySource(this.blocks, id, {
					runtimeTemplate,
					chunkGraph
				});
			}
			return this.getSourceForEmptyAsyncContext(id, runtimeTemplate);
		}
		if (asyncMode === "eager") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getEagerSource(this.dependencies, id, {
					chunkGraph,
					runtimeTemplate
				});
			}
			return this.getSourceForEmptyAsyncContext(id, runtimeTemplate);
		}
		if (asyncMode === "lazy-once") {
			const block = this.blocks[0];
			if (block) {
				return this.getLazyOnceSource(block, block.dependencies, id, {
					runtimeTemplate,
					chunkGraph
				});
			}
			return this.getSourceForEmptyAsyncContext(id, runtimeTemplate);
		}
		if (asyncMode === "async-weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getAsyncWeakSource(this.dependencies, id, {
					chunkGraph,
					runtimeTemplate
				});
			}
			return this.getSourceForEmptyAsyncContext(id, runtimeTemplate);
		}
		if (asyncMode === "weak") {
			if (this.dependencies && this.dependencies.length > 0) {
				return this.getWeakSyncSource(this.dependencies, id, chunkGraph);
			}
		}
		if (this.dependencies && this.dependencies.length > 0) {
			return this.getSyncSource(this.dependencies, id, chunkGraph);
		}
		return this.getSourceForEmptyContext(id, runtimeTemplate);
	}

	getSource(sourceString) {
		if (this.useSourceMap || this.useSimpleSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}
		return new RawSource(sourceString);
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		const { chunkGraph } = context;
		const sources = new Map();
		sources.set(
			"javascript",
			this.getSource(this.getSourceString(this.options.mode, context))
		);
		const set = new Set();
		const allDeps = /** @type {ContextElementDependency[]} */ (
			this.dependencies.concat(this.blocks.map(b => b.dependencies[0]))
		);
		set.add(RuntimeGlobals.module);
		set.add(RuntimeGlobals.hasOwnProperty);
		if (allDeps.length > 0) {
			const asyncMode = this.options.mode;
			set.add(RuntimeGlobals.require);
			if (asyncMode === "weak") {
				set.add(RuntimeGlobals.moduleFactories);
			} else if (asyncMode === "async-weak") {
				set.add(RuntimeGlobals.moduleFactories);
				set.add(RuntimeGlobals.ensureChunk);
			} else if (asyncMode === "lazy" || asyncMode === "lazy-once") {
				set.add(RuntimeGlobals.ensureChunk);
			}
			if (this.getFakeMap(allDeps, chunkGraph) !== 9) {
				set.add(RuntimeGlobals.createFakeNamespaceObject);
			}
		}
		return {
			sources,
			runtimeRequirements: set
		};
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		// base penalty
		let size = 160;

		// if we don't have dependencies we stop here.
		for (const dependency of this.dependencies) {
			const element = /** @type {ContextElementDependency} */ (dependency);
			size += 5 + element.userRequest.length;
		}
		return size;
	}

	serialize(context) {
		const { write } = context;
		write(this._identifier);
		write(this._forceBuild);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this._identifier = read();
		this._forceBuild = read();
		super.deserialize(context);
	}
}

makeSerializable(ContextModule, "webpack/lib/ContextModule");

module.exports = ContextModule;
