/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DependenciesBlock = require("./DependenciesBlock");
const Template = require("./Template");
const SortableSet = require("./util/SortableSet");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @typedef {Object} SourceContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {string=} type the type of source that should be generated
 */

/**
 * @typedef {Object} LibIdentOptions
 * @property {string} context absolute context path to which lib ident is relative to
 */

const EMPTY_RESOLVE_OPTIONS = {};
const optimizationBailoutSymbol = Symbol("optimization bailout");

let debugId = 1000;

const sortById = (a, b) => {
	return a.id - b.id;
};

const sortByDebugId = (a, b) => {
	return a.debugId - b.debugId;
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

		// Hash
		/** @type {string} */
		this.hash = undefined;
		/** @type {string} */
		this.renderedHash = undefined;

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
		/** @type {object} */
		this.buildMeta = undefined;
		/** @type {object} */
		this.buildInfo = undefined;

		// Graph (per Compilation)
		/** @type {SortableSet<Chunk>} */
		this._chunks = new SortableSet(undefined, sortById);

		// Info from Compilation (per Compilation)
		/** @type {number|string} */
		this.id = null;
		/** @type {number} */
		this.index = null;
		/** @type {number} */
		this.index2 = null;
		/** @type {number} */
		this.depth = null;
		/** @type {Module} */
		this.issuer = null;
		/** @type {undefined | object} */
		this.profile = undefined;
		/** @type {boolean} */
		this.prefetched = false;
		/** @type {boolean} */
		this.built = false;

		// Info from Optimization (per Compilation)
		/** @type {null | boolean} */
		this.used = null;
		/** @type {false | true | string[]} */
		this.usedExports = null;

		/** @type {boolean} */
		this.useSourceMap = false;
	}

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
	 * @returns {(string | OptimizationBailoutFunction)[]} optimization bailouts
	 */
	getOptimizationBailout(moduleGraph) {
		const meta = moduleGraph.getMeta(this);
		const list = meta[optimizationBailoutSymbol];
		if (list === undefined) {
			return (meta[optimizationBailoutSymbol] = []);
		}
		return list;
	}

	/**
	 * disconnect the module from the graph
	 * @returns {void}
	 */
	disconnect() {
		this.hash = undefined;
		this.renderedHash = undefined;

		this._chunks.clear();

		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this.issuer = null;
		this.profile = undefined;
		this.prefetched = false;
		this.built = false;

		this.used = null;
		this.usedExports = null;
		super.disconnect();
	}

	/**
	 * @returns {void}
	 */
	unseal() {
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this._chunks.clear();
		super.unseal();
	}

	/**
	 * Sets the chunks to a new value
	 * @protected
	 * @param {Iterable<Chunk>} chunks the new chunks
	 * @returns {void}
	 */
	setChunks(chunks) {
		this._chunks = new SortableSet(chunks, sortById);
	}

	/**
	 * @param {Chunk} chunk added chunk
	 * @returns {boolean} true, if the chunk could be added
	 */
	addChunk(chunk) {
		if (this._chunks.has(chunk)) return false;
		this._chunks.add(chunk);
		return true;
	}

	/**
	 * @param {Chunk} chunk removed chunk
	 * @returns {boolean} true, if the chunk could be removed
	 */
	removeChunk(chunk) {
		if (this._chunks.delete(chunk)) {
			chunk.removeModule(this);
			return true;
		}
		return false;
	}

	/**
	 * @param {Chunk} chunk chunk to be tested
	 * @returns {boolean} true, if the module is in a chunk
	 */
	isInChunk(chunk) {
		return this._chunks.has(chunk);
	}

	/**
	 * @returns {boolean} true, if the module is entry of any chunk
	 */
	isEntryModule() {
		for (const chunk of this._chunks) {
			if (chunk.entryModule === this) return true;
		}
		return false;
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
	 * @returns {Chunk[]} all chunks which contain the module
	 */
	getChunks() {
		return Array.from(this._chunks);
	}

	/**
	 * @returns {number} the number of chunk which contain the module
	 */
	getNumberOfChunks() {
		return this._chunks.size;
	}

	/**
	 * @returns {Iterable<Chunk>} chunks that contain the module
	 */
	get chunksIterable() {
		return this._chunks;
	}

	/**
	 * @param {Module} otherModule some other module
	 * @returns {boolean} true, if modules are in the same chunks
	 */
	hasEqualsChunks(otherModule) {
		if (this._chunks.size !== otherModule._chunks.size) return false;
		this._chunks.sortWith(sortByDebugId);
		otherModule._chunks.sortWith(sortByDebugId);
		const a = this._chunks[Symbol.iterator]();
		const b = otherModule._chunks[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			const bItem = b.next();
			if (aItem.done) return true;
			if (aItem.value !== bItem.value) return false;
		}
	}

	/**
	 * @param {Chunk} chunk a chunk
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunk" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunk(chunk, ignoreChunk) {
		// Check if module is accessible in ALL chunk groups
		for (const chunkGroup of chunk.groupsIterable) {
			if (!this.isAccessibleInChunkGroup(chunkGroup)) return false;
		}
		return true;
	}

	/**
	 * @param {ChunkGroup} chunkGroup a chunk group
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunkGroup" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunkGroup(chunkGroup, ignoreChunk) {
		const queue = new Set([chunkGroup]);

		// Check if module is accessible from all items of the queue
		queueFor: for (const cg of queue) {
			// 1. If module is in one of the chunks of the group we can continue checking the next items
			//    because it's accessible.
			for (const chunk of cg.chunks) {
				if (chunk !== ignoreChunk && chunk.containsModule(this))
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
	 * @returns {boolean} true, if the module has any reason why "chunk" should be included
	 */
	hasReasonForChunk(chunk, moduleGraph) {
		// check for each reason if we need the chunk
		for (const connection of moduleGraph.getIncomingConnections(this)) {
			const fromModule = connection.originModule;
			for (const originChunk of fromModule.chunksIterable) {
				// return true if module this is not reachable from originChunk when ignoring cunk
				if (!this.isAccessibleInChunk(originChunk, chunk)) return true;
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
	 * @param {string=} exportName a name of an export
	 * @returns {string | boolean} true, when no "exportName" is provided and the module is used.
	 *                             false, when module or referenced export is unused.
	 *                             string, the mangled export name when used.
	 */
	isUsed(exportName) {
		if (!exportName) return this.used !== false;
		if (this.used === null || this.usedExports === null) return exportName;
		if (!this.used) return false;
		if (!this.usedExports) return false;
		if (this.usedExports === true) return exportName;
		let idx = this.usedExports.indexOf(exportName);
		if (idx < 0) return false;

		// Mangle export name if possible
		if (this.isProvided(exportName)) {
			if (this.buildMeta.exportsType === "namespace") {
				return Template.numberToIdentifer(idx);
			}
			if (
				this.buildMeta.exportsType === "named" &&
				!this.usedExports.includes("default")
			) {
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
		return `Module[${this.id || this.debugId}]`;
	}

	/**
	 * @param {TODO} fileTimestamps timestamps of files
	 * @param {TODO} contextTimestamps timestamps of directories
	 * @returns {boolean} true, if the module needs a rebuild
	 */
	needRebuild(fileTimestamps, contextTimestamps) {
		return true;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {Compilation} compilation the compilation
	 * @returns {void}
	 */
	updateHash(hash, compilation) {
		hash.update(`${this.id}`);
		hash.update(JSON.stringify(this.usedExports));
		super.updateHash(hash, compilation);
	}

	/**
	 * Sorts items in this module
	 * @param {boolean=} sortChunks sort the chunks too
	 * @returns {void}
	 */
	sortItems(sortChunks) {
		super.sortItems();
		if (sortChunks) this._chunks.sort();
		if (Array.isArray(this.usedExports)) {
			this.usedExports.sort();
		}
	}

	/**
	 * @returns {void}
	 */
	unbuild() {
		this.dependencies.length = 0;
		this.blocks.length = 0;
		this.buildMeta = undefined;
		this.buildInfo = undefined;
		this.disconnect();
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
	 * @param {function(Error=): void} callback callback function
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
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk) {
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
		// do nothing
		// this method can be overriden
	}

	/**
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return null;
	}
}

module.exports = Module;
