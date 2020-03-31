/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const AbstractMethodError = require("./AbstractMethodError");
const ChunkGraph = require("./ChunkGraph");
const DependenciesBlock = require("./DependenciesBlock");
const ModuleGraph = require("./ModuleGraph");
const { compareChunksById } = require("./util/comparators");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./FileSystemInfo")} FileSystemInfo */
/** @typedef {import("./ModuleGraph").UsageStateType} UsageStateType */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */
/** @template T @typedef {import("./util/SortableSet")<T>} SortableSet<T> */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {Object} SourceContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {string=} type the type of source that should be generated
 */

/**
 * @typedef {Object} CodeGenerationContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

/**
 * @typedef {Object} CodeGenerationResult
 * @property {Map<string, Source>} sources the resulting sources for all source types
 * @property {ReadonlySet<string>} runtimeRequirements the runtime requirements
 */

/**
 * @typedef {Object} LibIdentOptions
 * @property {string} context absolute context path to which lib ident is relative to
 * @property {Object=} associatedObjectForCache object for caching
 */

/**
 * @typedef {Object} KnownBuildMeta
 * @property {string=} moduleArgument
 * @property {string=} exportsArgument
 * @property {boolean=} strict
 * @property {string=} moduleConcatenationBailout
 * @property {("default" | "namespace" | "flagged")=} exportsType
 * @property {(boolean | "redirect" | "redirect-warn")=} defaultObject
 * @property {boolean=} strictHarmonyModule
 * @property {boolean=} async
 */

/**
 * @typedef {Object} NeedBuildContext
 * @property {FileSystemInfo} fileSystemInfo
 */

/** @typedef {KnownBuildMeta & Record<string, any>} BuildMeta */

const EMPTY_RESOLVE_OPTIONS = {};

let debugId = 1000;

const DEFAULT_TYPES_UNKNOWN = new Set(["unknown"]);
const DEFAULT_TYPES_JS = new Set(["javascript"]);

/** @typedef {(requestShortener: RequestShortener) => string} OptimizationBailoutFunction */

class Module extends DependenciesBlock {
	/**
	 * @param {string} type the module type
	 * @param {string=} context an optional context
	 */
	constructor(type, context = null) {
		super();

		/** @type {string} */
		this.type = type;
		/** @type {string} */
		this.context = context;
		/** @type {boolean} */
		this.needId = true;

		// Unique Id
		/** @type {number} */
		this.debugId = debugId++;

		// Info from Factory
		/** @type {TODO} */
		this.resolveOptions = EMPTY_RESOLVE_OPTIONS;
		/** @type {object | undefined} */
		this.factoryMeta = undefined;

		// Info from Build
		/** @type {WebpackError[] | undefined} */
		this._warnings = undefined;
		/** @type {WebpackError[] | undefined} */
		this._errors = undefined;
		/** @type {BuildMeta} */
		this.buildMeta = undefined;
		/** @type {object} */
		this.buildInfo = undefined;
		/** @type {Dependency[] | undefined} */
		this.presentationalDependencies = undefined;
	}

	// TODO remove in webpack 6
	// BACKWARD-COMPAT START
	get id() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.id",
			"DEP_WEBPACK_MODULE_ID"
		).getModuleId(this);
	}

	set id(value) {
		if (value === "") {
			this.needId = false;
			return;
		}
		ChunkGraph.getChunkGraphForModule(
			this,
			"Module.id",
			"DEP_WEBPACK_MODULE_ID"
		).setModuleId(this, value);
	}

	/**
	 * @returns {string} the hash of the module
	 */
	get hash() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.hash",
			"DEP_WEBPACK_MODULE_HASH"
		).getModuleHash(this);
	}

	/**
	 * @returns {string} the shortened hash of the module
	 */
	get renderedHash() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.renderedHash",
			"DEP_WEBPACK_MODULE_RENDERED_HASHED"
		).getRenderedModuleHash(this);
	}

	get profile() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.profile",
			"DEP_WEBPACK_MODULE_PROFILE"
		).getProfile(this);
	}

	set profile(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.profile",
			"DEP_WEBPACK_MODULE_PROFILE"
		).setProfile(this, value);
	}

	get index() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index",
			"DEP_WEBPACK_MODULE_INDEX"
		).getPreOrderIndex(this);
	}

	set index(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index",
			"DEP_WEBPACK_MODULE_INDEX"
		).setPreOrderIndex(this, value);
	}

	get index2() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index2",
			"DEP_WEBPACK_MODULE_INDEX2"
		).getPostOrderIndex(this);
	}

	set index2(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.index2",
			"DEP_WEBPACK_MODULE_INDEX2"
		).setPostOrderIndex(this, value);
	}

	get depth() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.depth",
			"DEP_WEBPACK_MODULE_DEPTH"
		).getDepth(this);
	}

	set depth(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.depth",
			"DEP_WEBPACK_MODULE_DEPTH"
		).setDepth(this, value);
	}

	get issuer() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.issuer",
			"DEP_WEBPACK_MODULE_ISSUER"
		).getIssuer(this);
	}

	set issuer(value) {
		ModuleGraph.getModuleGraphForModule(
			this,
			"Module.issuer",
			"DEP_WEBPACK_MODULE_ISSUER"
		).setIssuer(this, value);
	}

	get usedExports() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.usedExports",
			"DEP_WEBPACK_MODULE_USED_EXPORTS"
		).getUsedExports(this);
	}

	get optimizationBailout() {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.optimizationBailout",
			"DEP_WEBPACK_MODULE_OPTIMIZATION_BAILOUT"
		).getOptimizationBailout(this);
	}

	get optional() {
		return this.isOptional(
			ModuleGraph.getModuleGraphForModule(
				this,
				"Module.optional",
				"DEP_WEBPACK_MODULE_OPTIONAL"
			)
		);
	}

	addChunk(chunk) {
		const chunkGraph = ChunkGraph.getChunkGraphForModule(
			this,
			"Module.addChunk",
			"DEP_WEBPACK_MODULE_ADD_CHUNK"
		);
		if (chunkGraph.isModuleInChunk(this, chunk)) return false;
		chunkGraph.connectChunkAndModule(chunk, this);
		return true;
	}

	removeChunk(chunk) {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.removeChunk",
			"DEP_WEBPACK_MODULE_REMOVE_CHUNK"
		).disconnectChunkAndModule(chunk, this);
	}

	isInChunk(chunk) {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.isInChunk",
			"DEP_WEBPACK_MODULE_IS_IN_CHUNK"
		).isModuleInChunk(this, chunk);
	}

	isEntryModule() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.isEntryModule",
			"DEP_WEBPACK_MODULE_IS_ENTRY_MODULE"
		).isEntryModule(this);
	}

	getChunks() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.getChunks",
			"DEP_WEBPACK_MODULE_GET_CHUNKS"
		).getModuleChunks(this);
	}

	getNumberOfChunks() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.getNumberOfChunks",
			"DEP_WEBPACK_MODULE_GET_NUMBER_OF_CHUNKS"
		).getNumberOfModuleChunks(this);
	}

	get chunksIterable() {
		return ChunkGraph.getChunkGraphForModule(
			this,
			"Module.chunksIterable",
			"DEP_WEBPACK_MODULE_CHUNKS_ITERABLE"
		).getOrderedModuleChunksIterable(this, compareChunksById);
	}

	/**
	 * @param {string} exportName a name of an export
	 * @returns {boolean | null} true, if the export is provided why the module.
	 * null, if it's unknown.
	 * false, if it's not provided.
	 */
	isProvided(exportName) {
		return ModuleGraph.getModuleGraphForModule(
			this,
			"Module.usedExports",
			"DEP_WEBPACK_MODULE_USED_EXPORTS"
		).isExportProvided(this, exportName);
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
	 * @param {boolean} strict the importing module is strict
	 * @returns {"dynamic" | "dynamic-default" | "namespace" | "default-only" | "default-with-named"} export type
	 */
	getExportsType(strict) {
		switch (this.buildMeta && this.buildMeta.exportsType) {
			case "flagged":
				return strict ? "dynamic-default" : "namespace";
			case "namespace":
				return "namespace";
			case "default":
				switch (this.buildMeta.defaultObject) {
					case "redirect":
					case "redirect-warn":
						return strict ? "default-only" : "default-with-named";
					default:
						return "default-only";
				}
			default:
				return strict ? "dynamic-default" : "dynamic";
		}
	}

	/**
	 * @param {Dependency} presentationalDependency dependency being tied to module.
	 * This is a Dependency without edge in the module graph. It's only for presentation.
	 * @returns {void}
	 */
	addPresentationalDependency(presentationalDependency) {
		if (this.presentationalDependencies === undefined) {
			this.presentationalDependencies = [];
		}
		this.presentationalDependencies.push(presentationalDependency);
	}

	/**
	 * Removes all dependencies and blocks
	 * @returns {void}
	 */
	clearDependenciesAndBlocks() {
		if (this.presentationalDependencies !== undefined) {
			this.presentationalDependencies.length = 0;
		}
		super.clearDependenciesAndBlocks();
	}

	/**
	 * @param {WebpackError} warning the warning
	 * @returns {void}
	 */
	addWarning(warning) {
		if (this._warnings === undefined) {
			this._warnings = [];
		}
		this._warnings.push(warning);
	}

	/**
	 * @returns {Iterable<WebpackError> | undefined} list of warnings if any
	 */
	getWarnings() {
		return this._warnings;
	}

	/**
	 * @param {WebpackError} error the error
	 * @returns {void}
	 */
	addError(error) {
		if (this._errors === undefined) {
			this._errors = [];
		}
		this._errors.push(error);
	}

	/**
	 * @returns {Iterable<WebpackError> | undefined} list of errors if any
	 */
	getErrors() {
		return this._errors;
	}

	/**
	 * removes all warnings and errors
	 * @returns {void}
	 */
	clearWarningsAndErrors() {
		if (this._warnings !== undefined) {
			this._warnings.length = 0;
		}
		if (this._errors !== undefined) {
			this._errors.length = 0;
		}
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true, if the module is optional
	 */
	isOptional(moduleGraph) {
		let hasConnections = false;
		for (const r of moduleGraph.getIncomingConnections(this)) {
			if (!r.dependency || !r.dependency.optional || !r.active) return false;
			hasConnections = true;
		}
		return hasConnections;
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
			if (!connection.active) continue;
			const fromModule = connection.originModule;
			for (const originChunk of chunkGraph.getModuleChunksIterable(
				fromModule
			)) {
				// return true if module this is not reachable from originChunk when ignoring chunk
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
		for (const c of moduleGraph.getIncomingConnections(this)) {
			if (c.active) return true;
		}
		return false;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true, if the module is used
	 */
	isModuleUsed(moduleGraph) {
		return moduleGraph.getExportsInfo(this).isUsed() !== false;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string | string[]} exportName a name of an export
	 * @returns {UsageStateType} state of the export
	 */
	isExportUsed(moduleGraph, exportName) {
		return moduleGraph.getExportsInfo(this).isExportUsed(exportName);
	}

	// TODO move to ModuleGraph
	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {string | string[]} exportName a name of an export
	 * @returns {string | string[] | false} false, when module or referenced export is unused.
	 * string, the mangled export name when used.
	 */
	getUsedName(moduleGraph, exportName) {
		return moduleGraph.getExportsInfo(this).getUsedName(exportName);
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
	updateHash(
		hash,
		chunkGraph = ChunkGraph.getChunkGraphForModule(
			this,
			"Module.updateHash",
			"DEP_WEBPACK_MODULE_UPDATE_HASH"
		)
	) {
		hash.update(`${chunkGraph.getModuleId(this)}`);
		const exportsInfo = chunkGraph.moduleGraph.getExportsInfo(this);
		for (const exportInfo of exportsInfo.orderedExports) {
			hash.update(exportInfo.name);
			hash.update(exportInfo.used + "");
			hash.update(
				exportInfo.usedName === ModuleGraph.SKIP_OVER_NAME
					? "<skip-over-name>"
					: exportInfo.usedName + ""
			);
		}
		if (this.presentationalDependencies !== undefined) {
			for (const dep of this.presentationalDependencies) {
				dep.updateHash(hash, chunkGraph);
			}
		}
		super.updateHash(hash, chunkGraph);
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		// should be overridden to support this feature
	}

	/**
	 * @abstract
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		throw new AbstractMethodError();
	}

	/**
	 * @abstract
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		throw new AbstractMethodError();
	}

	/**
	 * @abstract
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		throw new AbstractMethodError();
	}

	/**
	 * @abstract
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		// Better override this method to return the correct types
		if (this.source === Module.prototype.source) {
			return DEFAULT_TYPES_UNKNOWN;
		} else {
			return DEFAULT_TYPES_JS;
		}
	}

	/**
	 * @abstract
	 * @deprecated Use codeGeneration() instead
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		if (this.codeGeneration === Module.prototype.codeGeneration) {
			throw new AbstractMethodError();
		}
		const sources = this.codeGeneration(sourceContext).sources;
		return sourceContext.type
			? sources.get(sourceContext.type)
			: sources.get(this.getSourceTypes().values().next().value);
	}

	/**
	 * @abstract
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		throw new AbstractMethodError();
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
	 * @abstract
	 * @deprecated Use codeGeneration() instead
	 * Get a list of runtime requirements
	 * @param {SourceContext} context context for code generation
	 * @returns {ReadonlySet<string> | null} required runtime modules
	 */
	getRuntimeRequirements(context) {
		if (this.codeGeneration === Module.prototype.codeGeneration) {
			return null;
		}
		return this.codeGeneration(context).runtimeRequirements;
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		// Best override this method
		const sources = new Map();
		for (const type of this.getSourceTypes()) {
			if (type !== "unknown") {
				sources.set(
					type,
					this.source({
						...context,
						type
					})
				);
			}
		}
		return {
			sources,
			runtimeRequirements: this.getRuntimeRequirements(context)
		};
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
		write(
			this._warnings !== undefined && this._warnings.length === 0
				? undefined
				: this._warnings
		);
		write(
			this._errors !== undefined && this._errors.length === 0
				? undefined
				: this._errors
		);
		write(this.buildMeta);
		write(this.buildInfo);
		write(this.presentationalDependencies);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.type = read();
		this.context = read();
		this.resolveOptions = read();
		this.factoryMeta = read();
		this.useSourceMap = read();
		this._warnings = read();
		this._errors = read();
		this.buildMeta = read();
		this.buildInfo = read();
		this.presentationalDependencies = read();
		super.deserialize(context);
	}
}

makeSerializable(Module, "webpack/lib/Module");

// TODO remove in webpack 6
Object.defineProperty(Module.prototype, "hasEqualsChunks", {
	get() {
		throw new Error(
			"Module.hasEqualsChunks was renamed (use hasEqualChunks instead)"
		);
	}
});

// TODO remove in webpack 6
Object.defineProperty(Module.prototype, "isUsed", {
	get() {
		throw new Error(
			"Module.isUsed was renamed (use getUsedName, isExportUsed or isModuleUsed instead)"
		);
	}
});

// TODO remove in webpack 6
Object.defineProperty(Module.prototype, "errors", {
	get: util.deprecate(
		/**
		 * @this {Module}
		 * @returns {WebpackError[]} array
		 */
		function () {
			if (this._errors === undefined) {
				this._errors = [];
			}
			return this._errors;
		},
		"Module.errors was removed (use getErrors instead)",
		"DEP_WEBPACK_MODULE_ERRORS"
	)
});

// TODO remove in webpack 6
Object.defineProperty(Module.prototype, "warnings", {
	get: util.deprecate(
		/**
		 * @this {Module}
		 * @returns {WebpackError[]} array
		 */
		function () {
			if (this._warnings === undefined) {
				this._warnings = [];
			}
			return this._warnings;
		},
		"Module.warnings was removed (use getWarnings instead)",
		"DEP_WEBPACK_MODULE_WARNINGS"
	)
});

// TODO remove in webpack 6
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

module.exports = Module;
