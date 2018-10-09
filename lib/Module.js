/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ChunkGraph = require("./ChunkGraph");
const DependenciesBlock = require("./DependenciesBlock");
const ModuleGraph = require("./ModuleGraph");
const Template = require("./Template");
const { compareChunksById } = require("./util/comparators");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./FileSystemInfo")} FileSystemInfo */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @template T @typedef {import("./util/SortableSet")<T>} SortableSet<T> */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @typedef {Object} SourceContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {string=} type the type of source that should be generated
 */

/**
 * @typedef {Object} LibIdentOptions
 * @property {string} context absolute context path to which lib ident is relative to
 */

/**
 * @typedef {Object} KnownBuildMeta
 * @property {(boolean | string[])=} providedExports
 * @property {("named" | "namespace")=} exportsType
 */

/**
 * @typedef {Object} NeedBuildContext
 * @property {FileSystemInfo} fileSystemInfo
 */

/** @typedef {KnownBuildMeta & Record<string, any>} BuildMeta */

const EMPTY_RESOLVE_OPTIONS = {};

let debugId = 1000;

const getIndexMap = set => {
	set.sort();
	const map = new Map();
	let idx = 0;
	for (const item of set) {
		map.set(item, idx++);
	}
	return map;
};

const getJoinedString = set => {
	set.sort();
	return Array.from(set).join(",");
};

/** @typedef {(requestShortener: RequestShortener) => string} OptimizationBailoutFunction */

class Module extends DependenciesBlock {
	constructor(type, context = null) {
		super();
		/** @type {string} */
		this.type = type;
		/** @type {string} */
		this.context = context;

		// Unique Id
		/** @type {number} */
		this.debugId = debugId++;

		// Info from Factory
		/** @type {TODO} */
		this.resolveOptions = EMPTY_RESOLVE_OPTIONS;
		/** @type {object} */
		this.factoryMeta = {};

		// Info from Build
		/** @type {WebpackError[]} */
		this.warnings = [];
		/** @type {WebpackError[]} */
		this.errors = [];
		/** @type {BuildMeta} */
		this.buildMeta = undefined;
		/** @type {object} */
		this.buildInfo = undefined;

		/** @type {boolean} */
		this.useSourceMap = false;
	}

	// TODO remove in webpack 6
	// BACKWARD-COMPAT START
	get id() {
		return ChunkGraph.getChunkGraphForModule(this, "Module.id").getModuleId(
			this
		);
	}

	set id(value) {
		ChunkGraph.getChunkGraphForModule(this, "Module.id").setModuleId(
			this,
			value
		);
	}

	/**
	 * @returns {string} the hash of the module
	 */
	get hash() {
		return ChunkGraph.getChunkGraphForModule(this, "Module.hash").getModuleHash(
			this
		);
	}

	/**
	 * @returns {string} the shortened hash of the module
	 */
	get renderedHash() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.renderedHash"
		).getRenderedModuleHash(this);
	}

	get profile() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.profile"
		).getProfile(this);
	}

	set profile(value) {
		ModuleGraph.getModuleGraphForModule(this, "Module.profile").setProfile(
			this,
			value
		);
	}

	get index() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index"
		).getPreOrderIndex(this);
	}

	set index(value) {
		ModuleGraph.getModuleGraphForModule(this, "Module.index").setPreOrderIndex(
			this,
			value
		);
	}

	get index2() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index2"
		).getPostOrderIndex(this);
	}

	set index2(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index2"
		).setPostOrderIndex(this, value);
	}

	get depth() {
		return ModuleGraph.getModuleGraphForModule(this, "Module.depth").getDepth(
			this
		);
	}

	set depth(value) {
		ModuleGraph.getModuleGraphForModule(this, "Module.depth").setDepth(
			this,
			value
		);
	}

	get issuer() {
		return ModuleGraph.getModuleGraphForModule(this, "Module.issuer").getIssuer(
			this
		);
	}

	set issuer(value) {
		ModuleGraph.getModuleGraphForModule(this, "Module.issuer").setIssuer(
			this,
			value
		);
	}

	get usedExports() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.usedExports"
		).getUsedExports(this);
	}

	set usedExports(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.usedExports"
		).setUsedExports(this, value);
	}

	get optimizationBailout() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.optimizationBailout"
		).getOptimizationBailout(this);
	}

	get optional() {
		return this.isOptional(
			ModuleGraph.getModuleGraphForModule(this, "Module.optional")
		);
	}

	addChunk(chunk) {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.addChunk"
		).connectChunkAndModule(chunk, this);
	}

	removeChunk(chunk) {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.removeChunk"
		).disconnectChunkAndModule(chunk, this);
	}

	isInChunk(chunk) {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.isInChunk"
		).isModuleInChunk(this, chunk);
	}

	isEntryModule() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.isEntryModule"
		).isEntryModule(this);
	}

	getChunks() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.getChunks"
		).getModuleChunks(this);
	}

	getNumberOfChunks() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.getNumberOfChunks"
		).getNumberOfModuleChunks(this);
	}

	get chunksIterable() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.chunksIterable"
		).getOrderedModuleChunksIterable(this, compareChunksById);
	}
	// BACKWARD-COMPAT END

	/**
	 * @deprecated moved to .buildInfo.exportsArgument
	 * @returns {string} name of the exports argument
	 */
	get exportsArgument() {
		return (this.buildInfo && this.buildInfo.exportsArgument) || "exports";
	}

	/**
	 * @deprecated moved to .buildInfo.moduleArgument
	 * @returns {string} name of the module argument
	 */
	get moduleArgument() {
		return (this.buildInfo && this.buildInfo.moduleArgument) || "module";
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true, if the module is optional
	 */
	isOptional(moduleGraph) {
		const connections = moduleGraph.getIncomingConnections(this);
		return (
			connections.length > 0 &&
			connections.every(r => r.dependency && r.dependency.optional)
		);
	}

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {Chunk} chunk a chunk
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunk" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunk(chunkGraph, chunk, ignoreChunk) {
		// Check if module is accessible in ALL chunk groups
		for (const chunkGroup of chunk.groupsIterable) {
			if (!this.isAccessibleInChunkGroup(chunkGraph, chunkGroup)) return false;
		}
		return true;
	}

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {ChunkGroup} chunkGroup a chunk group
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunkGroup" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunkGroup(chunkGraph, chunkGroup, ignoreChunk) {
		const queue = new Set([chunkGroup]);

		// Check if module is accessible from all items of the queue
		queueFor: for (const cg of queue) {
			// 1. If module is in one of the chunks of the group we can continue checking the next items
			//    because it's accessible.
			for (const chunk of cg.chunks) {
				if (chunk !== ignoreChunk && chunkGraph.isModuleInChunk(this, chunk))
					continue queueFor;
			}
			// 2. If the chunk group is initial, we can break here because it's not accessible.
			if (chunkGroup.isInitial()) return false;
			// 3. Enqueue all parents because it must be accessible from ALL parents
			for (const parent of chunkGroup.parentsIterable) queue.add(parent);
		}
		// When we processed through the whole list and we didn't bailout, the module is accessible
		return true;
	}

	/**
	 * @param {Chunk} chunk a chunk
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true, if the module has any reason why "chunk" should be included
	 */
	hasReasonForChunk(chunk, moduleGraph, chunkGraph) {
		// check for each reason if we need the chunk
		for (const connection of moduleGraph.getIncomingConnections(this)) {
			const fromModule = connection.originModule;
			for (const originChunk of chunkGraph.getModuleChunksIterable(
				fromModule
			)) {
				// return true if module this is not reachable from originChunk when ignoring cunk
				if (!this.isAccessibleInChunk(chunkGraph, originChunk, chunk))
					return true;
			}
		}
		return false;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true if at least one other module depends on this module
	 */
	hasReasons(moduleGraph) {
		return moduleGraph.getIncomingConnections(this).length > 0;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true, if the module is used
	 */
	isModuleUsed(moduleGraph) {
		return moduleGraph.getUsedExports(this) !== false;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string} exportName a name of an export
	 * @returns {boolean} true, if the export is used
	 */
	isExportUsed(moduleGraph, exportName) {
		const usedExports = moduleGraph.getUsedExports(this);
		if (usedExports === null || usedExports === true) return true;
		if (usedExports === false) return false;
		return usedExports.has(exportName);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string} exportName a name of an export
	 * @returns {string | false} false, when module or referenced export is unused.
	 *                           string, the mangled export name when used.
	 */
	getUsedName(moduleGraph, exportName) {
		const usedExports = moduleGraph.getUsedExports(this);
		if (usedExports === null || usedExports === true) return exportName;
		if (usedExports === false) return false;
		if (!usedExports.has(exportName)) return false;

		// Mangle export name if possible
		if (this.isProvided(exportName)) {
			if (this.buildMeta.exportsType === "namespace") {
				const idx = usedExports
					.getFromUnorderedCache(getIndexMap)
					.get(exportName);
				return Template.numberToIdentifer(idx);
			}
			if (
				this.buildMeta.exportsType === "named" &&
				!usedExports.has("default")
			) {
				const idx = usedExports
					.getFromUnorderedCache(getIndexMap)
					.get(exportName);
				return Template.numberToIdentifer(idx);
			}
		}
		return exportName;
	}

	/**
	 * @param {string} exportName a name of an export
	 * @returns {boolean | null} true, if the export is provided why the module.
	 *                           null, if it's unknown.
	 *                           false, if it's not provided.
	 */
	isProvided(exportName) {
		if (!Array.isArray(this.buildMeta.providedExports)) return null;
		return this.buildMeta.providedExports.includes(exportName);
	}

	/**
	 * @returns {string} for debugging
	 */
	toString() {
		return `Module[${this.debugId}: ${this.identifier()}]`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(
			null,
			!this.buildMeta ||
				this.needRebuild === Module.prototype.needRebuild ||
				this.needRebuild(
					context.fileSystemInfo.getDeprecatedFileTimestamps(),
					context.fileSystemInfo.getDeprecatedContextTimestamps()
				)
		);
	}

	/**
	 * @deprecated Use needBuild instead
	 * @param {TODO} fileTimestamps timestamps of files
	 * @param {TODO} contextTimestamps timestamps of directories
	 * @returns {boolean} true, if the module needs a rebuild
	 */
	needRebuild(fileTimestamps, contextTimestamps) {
		return true;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(`${chunkGraph.getModuleId(this)}`);
		const usedExports = chunkGraph.moduleGraph.getUsedExports(this);
		if (typeof usedExports === "boolean") {
			hash.update(JSON.stringify(usedExports));
		} else if (!usedExports) {
			hash.update("null");
		} else {
			hash.update(usedExports.getFromUnorderedCache(getJoinedString));
		}
		super.updateHash(hash, chunkGraph);
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		// should be overriden to support this feature
	}

	/**
	 * @abstract
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		throw new Error("Module.identifier: Must be overriden");
	}

	/**
	 * @abstract
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		throw new Error("Module.readableIdentifier: Must be overriden");
	}

	/**
	 * @abstract
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		throw new Error("Module.build: Must be overriden");
	}

	/**
	 * @abstract
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		throw new Error("Module.source: Must be overriden");
	}

	/**
	 * @abstract
	 * @returns {number} the estimated size of the module
	 */
	size() {
		throw new Error("Module.size: Must be overriden");
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return null;
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return null;
	}

	/**
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk, compilation) {
		return true;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		this.type = module.type;
		this.context = module.context;
		this.factoryMeta = module.factoryMeta;
		this.resolveOptions = module.resolveOptions;
	}

	/**
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return null;
	}

	serialize(context) {
		const { write } = context;
		write(this.type);
		write(this.context);
		write(this.resolveOptions);
		write(this.factoryMeta);
		write(this.useSourceMap);
		write(this.warnings);
		write(this.errors);
		write(this.buildMeta);
		write(this.buildInfo);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.type = read();
		this.context = read();
		this.resolveOptions = read();
		this.factoryMeta = read();
		this.useSourceMap = read();
		this.warnings = read();
		this.errors = read();
		this.buildMeta = read();
		this.buildInfo = read();
		super.deserialize(context);
	}
}

makeSerializable(Module, "webpack/lib/Module");

Object.defineProperty(Module.prototype, "hasEqualsChunks", {
	get() {
		throw new Error(
			"Module.hasEqualsChunks was renamed (use hasEqualChunks instead)"
		);
	}
});

Object.defineProperty(Module.prototype, "isUsed", {
	get() {
		throw new Error(
			"Module.isUsed was renamed (use getUsedName, isExportUsed or isModuleUsed instead)"
		);
	}
});

Object.defineProperty(Module.prototype, "used", {
	get() {
		throw new Error(
			"Module.used was refactored (use ModuleGraph.getUsedExports instead)"
		);
	},
	set(value) {
		throw new Error(
			"Module.used was refactored (use ModuleGraph.setUsedExports instead)"
		);
	}
});

Object.defineProperty(Module.prototype, "usedExports", {
	get() {
		throw new Error(
			"Module.usedExports was refactored (use ModuleGraph.getUsedExports instead)"
		);
	},
	set(value) {
		throw new Error(
			"Module.usedExports was refactored (use ModuleGraph.setUsedExports instead)"
		);
	}
});

module.exports = Module;
