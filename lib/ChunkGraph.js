/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const SortableSet = require("./util/SortableSet");
const {
	compareModulesById,
	compareIterables,
	compareModulesByIdentifier
} = require("./util/comparators");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */

const compareModuleIterables = compareIterables(compareModulesByIdentifier);

/** @typedef {(c: Chunk) => boolean} ChunkFilterPredicate */
/** @typedef {(m: Module) => boolean} ModuleFilterPredicate */

/**
 * @typedef {Object} ChunkSizeOptions
 * @property {number=} chunkOverhead constant overhead for a chunk
 * @property {number=} entryChunkMultiplicator multiplicator for initial chunks
 */

/**
 * @typedef {Object} ChunkModuleMaps
 * @property {Record<string|number, (string|number)[]>} id
 * @property {Record<string|number, string>} hash
 */

/**
 * @param {Chunk} a chunk
 * @param {Chunk} b chunk
 * @returns {number} compare result
 */
const sortChunksByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

/** @template T @typedef {(set: SortableSet<T>) => T[]} SetToArrayFunction<T> */

/**
 * @template T
 * @param {SortableSet<T>} set the set
 * @returns {T[]} set as array
 */
const getArray = set => {
	return Array.from(set);
};

/** @type {WeakMap<Function, any>} */
const createOrderedArrayFunctionMap = new WeakMap();

/**
 * @template T
 * @param {function(T, T): -1|0|1} comparator comparator function
 * @returns {SetToArrayFunction<T>} set as ordered array
 */
const createOrderedArrayFunction = comparator => {
	/** @type {SetToArrayFunction<T>} */
	let fn = createOrderedArrayFunctionMap.get(comparator);
	if (fn !== undefined) return fn;
	fn = set => {
		set.sortWith(comparator);
		return Array.from(set);
	};
	createOrderedArrayFunctionMap.set(comparator, fn);
	return fn;
};

/**
 * @param {SortableSet<Module>} set the sortable Set to get the count/size of
 * @returns {number} the size of the modules
 */
const getModulesSize = set => {
	let size = 0;
	for (const module of set) {
		size += module.size();
	}
	return size;
};

class ChunkGraphModule {
	constructor() {
		/** @type {SortableSet<Chunk>} */
		this.chunks = new SortableSet();
		/** @type {Set<Chunk>} */
		this.entryInChunks = new Set();
		/** @type {Set<Chunk>} */
		this.runtimeInChunks = new Set();
		/** @type {string} */
		this.hash = undefined;
		/** @type {string} */
		this.renderedHash = undefined;
		/** @type {string | number} */
		this.id = null;
		/** @type {Set<string>} */
		this.runtimeRequirements = new Set();
	}
}

class ChunkGraphChunk {
	constructor() {
		/** @type {SortableSet<Module>} */
		this.modules = new SortableSet();
		/** @type {Map<Module, ChunkGroup>} */
		this.entryModules = new Map();
		/** @type {SortableSet<Module>} */
		this.runtimeModules = new SortableSet();
		/** @type {Set<string>} */
		this.runtimeRequirements = new Set();
	}
}

class ChunkGraph {
	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(moduleGraph) {
		/** @private @type {WeakMap<Module, ChunkGraphModule>} */
		this._modules = new WeakMap();
		/** @private @type {WeakMap<Chunk, ChunkGraphChunk>} */
		this._chunks = new WeakMap();
		/** @private @type {WeakMap<AsyncDependenciesBlock, ChunkGroup>} */
		this._blockChunkGroups = new WeakMap();
		/** @private @type {ModuleGraph} */
		this.moduleGraph = moduleGraph;
	}

	/**
	 * @private
	 * @param {Module} module the module
	 * @returns {ChunkGraphModule} internal module
	 */
	_getChunkGraphModule(module) {
		let m = this._modules.get(module);
		if (m === undefined) {
			m = new ChunkGraphModule();
			this._modules.set(module, m);
		}
		return m;
	}

	/**
	 * @private
	 * @param {Chunk} chunk the chunk
	 * @returns {ChunkGraphChunk} internal chunk
	 */
	_getChunkGraphChunk(chunk) {
		let c = this._chunks.get(chunk);
		if (c === undefined) {
			c = new ChunkGraphChunk();
			this._chunks.set(chunk, c);
		}
		return c;
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the module
	 * @returns {boolean} true, if the chunk could be added. false if it was already added
	 */
	connectChunkAndModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		// TODO refactor to remove return value
		if (cgm.chunks.has(chunk) && cgc.modules.has(module)) return false;
		cgm.chunks.add(chunk);
		cgc.modules.add(module);
		return true;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Module} module the module
	 * @returns {void}
	 */
	disconnectChunkAndModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgc.modules.delete(module);
		cgm.chunks.delete(chunk);
	}

	/**
	 * @param {Chunk} chunk the chunk which will be disconnected
	 * @returns {void}
	 */
	disconnectChunk(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		for (const module of cgc.modules) {
			const cgm = this._getChunkGraphModule(module);
			cgm.chunks.delete(chunk);
		}
		cgc.modules.clear();
		chunk.disconnectFromGroups();
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Iterable<Module>} modules the modules
	 * @returns {void}
	 */
	attachModules(chunk, modules) {
		const cgc = this._getChunkGraphChunk(chunk);
		for (const module of modules) {
			cgc.modules.add(module);
		}
	}

	/**
	 * @param {Module} oldModule the replaced module
	 * @param {Module} newModule the replacing module
	 * @returns {void}
	 */
	replaceModule(oldModule, newModule) {
		const oldCgm = this._getChunkGraphModule(oldModule);
		const newCgm = this._getChunkGraphModule(newModule);

		for (const chunk of oldCgm.chunks) {
			const cgc = this._getChunkGraphChunk(chunk);
			cgc.modules.delete(oldModule);
			cgc.modules.add(newModule);
			newCgm.chunks.add(chunk);
		}
		oldCgm.chunks.clear();

		for (const chunk of oldCgm.entryInChunks) {
			const cgc = this._getChunkGraphChunk(chunk);
			const old = cgc.entryModules.get(oldModule);
			const newEntryModules = new Map();
			for (const [m, cg] of cgc.entryModules) {
				if (m === oldModule) {
					newEntryModules.set(newModule, old);
				} else {
					newEntryModules.set(m, cg);
				}
			}
			cgc.entryModules = newEntryModules;
			newCgm.entryInChunks.add(chunk);
		}
		oldCgm.entryInChunks.clear();

		for (const chunk of oldCgm.runtimeInChunks) {
			const cgc = this._getChunkGraphChunk(chunk);
			cgc.runtimeModules.delete(oldModule);
			cgc.runtimeModules.add(newModule);
			newCgm.runtimeInChunks.add(chunk);
		}
		oldCgm.runtimeInChunks.clear();
	}

	/**
	 * @param {Module} module the checked module
	 * @param {Chunk} chunk the checked chunk
	 * @returns {boolean} true, if the chunk contains the module
	 */
	isModuleInChunk(module, chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.has(module);
	}

	/**
	 * @param {Module} module the checked module
	 * @param {ChunkGroup} chunkGroup the checked chunk group
	 * @returns {boolean} true, if the chunk contains the module
	 */
	isModuleInChunkGroup(module, chunkGroup) {
		for (const chunk of chunkGroup.chunks) {
			if (this.isModuleInChunk(module, chunk)) return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the checked module
	 * @returns {boolean} true, if the module is entry of any chunk
	 */
	isEntryModule(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.entryInChunks.size > 0;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getModuleChunksIterable(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks;
	}

	/**
	 * @param {Module} module the module
	 * @param {function(Chunk, Chunk): -1|0|1} sortFn sort function
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getOrderedModuleChunksIterable(module, sortFn) {
		const cgm = this._getChunkGraphModule(module);
		cgm.chunks.sortWith(sortFn);
		return cgm.chunks;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Chunk[]} array of chunks (cached, do not modify)
	 */
	getModuleChunks(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks.getFromCache(getArray);
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the number of chunk which contain the module
	 */
	getNumberOfModuleChunks(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks.size;
	}

	/**
	 * @param {Module} moduleA some module
	 * @param {Module} moduleB some module
	 * @returns {boolean} true, if modules are in the same chunks
	 */
	haveModulesEqualChunks(moduleA, moduleB) {
		const cgmA = this._getChunkGraphModule(moduleA);
		const cgmB = this._getChunkGraphModule(moduleB);
		if (cgmA.chunks.size !== cgmB.chunks.size) return false;
		cgmA.chunks.sortWith(sortChunksByDebugId);
		cgmB.chunks.sortWith(sortChunksByDebugId);
		const a = cgmA.chunks[Symbol.iterator]();
		const b = cgmB.chunks[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			if (aItem.done) return true;
			const bItem = b.next();
			if (aItem.value !== bItem.value) return false;
		}
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {number} the number of module which are contained in this chunk
	 */
	getNumberOfChunkModules(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.size;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<Module>} return the modules for this chunk
	 */
	getChunkModulesIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {function(Module, Module): -1|0|1} comparator comparator function
	 * @returns {Iterable<Module>} return the modules for this chunk
	 */
	getOrderedChunkModulesIterable(chunk, comparator) {
		const cgc = this._getChunkGraphChunk(chunk);
		cgc.modules.sortWith(comparator);
		return cgc.modules;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Module[]} return the modules for this chunk (cached, do not modify)
	 */
	getChunkModules(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.getFromUnorderedCache(getArray);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {function(Module, Module): -1|0|1} comparator comparator function
	 * @returns {Module[]} return the modules for this chunk (cached, do not modify)
	 */
	getOrderedChunkModules(chunk, comparator) {
		const cgc = this._getChunkGraphChunk(chunk);
		const arrayFunction = createOrderedArrayFunction(comparator);
		return cgc.modules.getFromUnorderedCache(arrayFunction);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ModuleFilterPredicate} filterFn function used to filter modules
	 * @returns {ChunkModuleMaps} module map information
	 */
	getChunkModuleMaps(chunk, filterFn) {
		/** @type {Record<string|number, (string|number)[]>} */
		const chunkModuleIdMap = Object.create(null);
		/** @type {Record<string|number, string>} */
		const chunkModuleHashMap = Object.create(null);

		for (const asyncChunk of chunk.getAllAsyncChunks()) {
			/** @type {(string|number)[]} */
			let array;
			for (const module of this.getOrderedChunkModulesIterable(
				asyncChunk,
				compareModulesById(this)
			)) {
				if (filterFn(module)) {
					if (array === undefined) {
						array = [];
						chunkModuleIdMap[asyncChunk.id] = array;
					}
					const moduleId = this.getModuleId(module);
					array.push(moduleId);
					chunkModuleHashMap[moduleId] = this.getRenderedModuleHash(module);
				}
			}
			if (array !== undefined) {
				array.sort();
			}
		}

		return {
			id: chunkModuleIdMap,
			hash: chunkModuleHashMap
		};
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ModuleFilterPredicate} filterFn predicate function used to filter modules
	 * @param {ChunkFilterPredicate=} filterChunkFn predicate function used to filter chunks
	 * @returns {boolean} return true if module exists in graph
	 */
	hasModuleInGraph(chunk, filterFn, filterChunkFn) {
		const queue = new Set(chunk.groupsIterable);
		const chunksProcessed = new Set();

		for (const chunkGroup of queue) {
			for (const innerChunk of chunkGroup.chunks) {
				if (!chunksProcessed.has(innerChunk)) {
					chunksProcessed.add(innerChunk);
					if (!filterChunkFn || filterChunkFn(innerChunk)) {
						for (const module of this.getChunkModulesIterable(innerChunk)) {
							if (filterFn(module)) {
								return true;
							}
						}
					}
				}
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}
		return false;
	}

	/**
	 * @param {Chunk} chunkA first chunk
	 * @param {Chunk} chunkB second chunk
	 * @returns {-1|0|1} this is a comparator function like sort and returns -1, 0, or 1 based on sort order
	 */
	compareChunks(chunkA, chunkB) {
		const cgcA = this._getChunkGraphChunk(chunkA);
		const cgcB = this._getChunkGraphChunk(chunkB);
		if (cgcA.modules.size > cgcB.modules.size) return -1;
		if (cgcA.modules.size < cgcB.modules.size) return 1;
		cgcA.modules.sortWith(compareModulesByIdentifier);
		cgcB.modules.sortWith(compareModulesByIdentifier);
		return compareModuleIterables(cgcA.modules, cgcB.modules);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {number} total size of all modules in the chunk
	 */
	getChunkModulesSize(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.getFromUnorderedCache(getModulesSize);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ChunkSizeOptions} options options object
	 * @returns {number} total size of the chunk
	 */
	getChunkSize(chunk, options) {
		const cgc = this._getChunkGraphChunk(chunk);
		const modulesSize = cgc.modules.getFromUnorderedCache(getModulesSize);
		const chunkOverhead =
			typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const entryChunkMultiplicator =
			typeof options.entryChunkMultiplicator === "number"
				? options.entryChunkMultiplicator
				: 10;
		return (
			chunkOverhead +
			modulesSize * (chunk.canBeInitial() ? entryChunkMultiplicator : 1)
		);
	}

	/**
	 * @param {Chunk} chunkA chunk
	 * @param {Chunk} chunkB chunk
	 * @param {ChunkSizeOptions} options options object
	 * @returns {number} total size of the chunk or false if chunks can't be integrated
	 */
	getIntegratedChunksSize(chunkA, chunkB, options) {
		const cgcA = this._getChunkGraphChunk(chunkA);
		const cgcB = this._getChunkGraphChunk(chunkB);
		const allModules = new Set(cgcA.modules);
		for (const m of cgcB.modules) allModules.add(m);
		let modulesSize = 0;
		for (const module of allModules) {
			modulesSize += module.size();
		}
		const chunkOverhead =
			typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const entryChunkMultiplicator =
			typeof options.entryChunkMultiplicator === "number"
				? options.entryChunkMultiplicator
				: 10;
		return (
			chunkOverhead +
			modulesSize *
				(chunkA.canBeInitial() || chunkB.canBeInitial()
					? entryChunkMultiplicator
					: 1)
		);
	}

	/**
	 * @param {Chunk} chunkA chunk
	 * @param {Chunk} chunkB chunk
	 * @returns {boolean} true, if chunks could be integrated
	 */
	canChunksBeIntegrated(chunkA, chunkB) {
		/**
		 * @param {Chunk} a chunk
		 * @param {Chunk} b chunk
		 * @returns {boolean} true, if a is always a parent of b
		 */
		const isAvailable = (a, b) => {
			const queue = new Set(b.groupsIterable);
			for (const chunkGroup of queue) {
				if (a.isInGroup(chunkGroup)) continue;
				if (chunkGroup.isInitial()) return false;
				for (const parent of chunkGroup.parentsIterable) {
					queue.add(parent);
				}
			}
			return true;
		};

		if (chunkA.preventIntegration || chunkB.preventIntegration) {
			return false;
		}

		if (chunkA.hasRuntime() !== chunkB.hasRuntime()) {
			if (chunkA.hasRuntime()) {
				return isAvailable(chunkA, chunkB);
			} else if (chunkB.hasRuntime()) {
				return isAvailable(chunkB, chunkA);
			} else {
				return false;
			}
		}

		if (
			this.getNumberOfEntryModules(chunkA) > 0 ||
			this.getNumberOfEntryModules(chunkB) > 0
		) {
			return false;
		}

		return true;
	}

	/**
	 * @param {Chunk} chunkA the target chunk
	 * @param {Chunk} chunkB the chunk to integrate
	 * @returns {void}
	 */
	integrateChunks(chunkA, chunkB) {
		// Decide for one name (deterministic)
		if (chunkA.name && chunkB.name) {
			if (
				this.getNumberOfEntryModules(chunkA) > 0 ===
				this.getNumberOfEntryModules(chunkB) > 0
			) {
				// When both chunks have entry modules or none have one, use
				// shortest name
				if (chunkA.name.length !== chunkB.name.length) {
					chunkA.name =
						chunkA.name.length < chunkB.name.length ? chunkA.name : chunkB.name;
				} else {
					chunkA.name = chunkA.name < chunkB.name ? chunkA.name : chunkB.name;
				}
			} else if (this.getNumberOfEntryModules(chunkB) > 0) {
				// Pick the name of the chunk with the entry module
				chunkA.name = chunkB.name;
			}
		} else if (chunkB.name) {
			chunkA.name = chunkB.name;
		}

		// getChunkModules is used here to create a clone, because disconnectChunkAndModule modifies
		for (const module of this.getChunkModules(chunkB)) {
			this.disconnectChunkAndModule(chunkB, module);
			this.connectChunkAndModule(chunkA, module);
		}

		for (const [module, chunkGroup] of Array.from(
			this.getChunkEntryModulesWithChunkGroupIterable(chunkB)
		)) {
			this.disconnectChunkAndEntryModule(chunkB, module);
			this.connectChunkAndEntryModule(chunkA, module, chunkGroup);
		}

		for (const chunkGroup of chunkB.groupsIterable) {
			chunkGroup.replaceChunk(chunkB, chunkA);
			chunkA.addGroup(chunkGroup);
			chunkB.removeGroup(chunkGroup);
		}
	}

	/**
	 * @param {Module} module the checked module
	 * @param {Chunk} chunk the checked chunk
	 * @returns {boolean} true, if the chunk contains the module as entry
	 */
	isEntryModuleInChunk(module, chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.entryModules.has(module);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the entry module
	 * @param {ChunkGroup=} chunkGroup the chunk group which must be loaded before the module is executed
	 * @returns {void}
	 */
	connectChunkAndEntryModule(chunk, module, chunkGroup) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.entryInChunks.add(chunk);
		cgc.entryModules.set(module, chunkGroup);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the runtime module
	 * @returns {void}
	 */
	connectChunkAndRuntimeModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.runtimeInChunks.add(chunk);
		cgc.runtimeModules.add(module);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the entry module
	 * @returns {void}
	 */
	disconnectChunkAndEntryModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.entryInChunks.delete(chunk);
		cgc.entryModules.delete(module);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the entry module
	 * @returns {void}
	 */
	disconnectChunkAndRuntimeModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.runtimeInChunks.delete(chunk);
		cgc.runtimeModules.delete(module);
	}

	/**
	 * @param {Module} module the entry module, it will no longer be entry
	 * @returns {void}
	 */
	disconnectEntryModule(module) {
		const cgm = this._getChunkGraphModule(module);
		for (const chunk of cgm.entryInChunks) {
			const cgc = this._getChunkGraphChunk(chunk);
			cgc.entryModules.delete(module);
		}
		cgm.entryInChunks.clear();
	}

	/**
	 * @param {Chunk} chunk the chunk, for which all entries will be removed
	 * @returns {void}
	 */
	disconnectEntries(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		for (const module of cgc.entryModules.keys()) {
			const cgm = this._getChunkGraphModule(module);
			cgm.entryInChunks.delete(chunk);
		}
		cgc.entryModules.clear();
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {number} the amount of entry modules in chunk
	 */
	getNumberOfEntryModules(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.entryModules.size;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {number} the amount of entry modules in chunk
	 */
	getNumberOfRuntimeModules(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.runtimeModules.size;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<Module>} iterable of modules (do not modify)
	 */
	getChunkEntryModulesIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.entryModules.keys();
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<Module>} iterable of modules (do not modify)
	 */
	getChunkRuntimeModulesIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.runtimeModules;
	}

	/** @typedef {[Module, ChunkGroup | undefined]} EntryModuleWithChunkGroup */

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<EntryModuleWithChunkGroup>} iterable of modules (do not modify)
	 */
	getChunkEntryModulesWithChunkGroupIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.entryModules;
	}

	/**
	 * @param {AsyncDependenciesBlock} depBlock the async block
	 * @returns {ChunkGroup} the chunk group
	 */
	getBlockChunkGroup(depBlock) {
		return this._blockChunkGroups.get(depBlock);
	}

	/**
	 * @param {AsyncDependenciesBlock} depBlock the async block
	 * @param {ChunkGroup} chunkGroup the chunk group
	 * @returns {void}
	 */
	connectBlockAndChunkGroup(depBlock, chunkGroup) {
		this._blockChunkGroups.set(depBlock, chunkGroup);
		chunkGroup.addBlock(depBlock);
	}

	/**
	 * @param {ChunkGroup} chunkGroup the chunk group
	 * @returns {void}
	 */
	disconnectChunkGroup(chunkGroup) {
		for (const block of chunkGroup.blocksIterable) {
			this._blockChunkGroups.delete(block);
		}
		// TODO refactor by moving blocks list into ChunkGraph
		chunkGroup._blocks.clear();
	}

	/**
	 * @param {Module} module the module
	 * @returns {string | number} the id of the module
	 */
	getModuleId(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.id;
	}

	/**
	 * @param {Module} module the module
	 * @param {string | number} id the id of the module
	 * @returns {void}
	 */
	setModuleId(module, id) {
		const cgm = this._getChunkGraphModule(module);
		cgm.id = id;
	}

	/**
	 * @param {Module} module the module
	 * @returns {string} hash
	 */
	getModuleHash(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.hash;
	}

	/**
	 * @param {Module} module the module
	 * @returns {string} hash
	 */
	getRenderedModuleHash(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.renderedHash;
	}

	/**
	 * @param {Module} module the module
	 * @param {string} hash the full hash
	 * @param {string} renderedHash the shortened hash for rendering
	 * @returns {void}
	 */
	setModuleHashes(module, hash, renderedHash) {
		const cgm = this._getChunkGraphModule(module);
		cgm.hash = hash;
		cgm.renderedHash = renderedHash;
	}

	/**
	 * @param {Module} module the module
	 * @param {Iterable<string>} items runtime requirements to be added
	 * @returns {void}
	 */
	addModuleRuntimeRequirements(module, items) {
		const cgm = this._getChunkGraphModule(module);
		const runtimeRequirements = cgm.runtimeRequirements;
		for (const item of items) runtimeRequirements.add(item);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Iterable<string>} items runtime requirements to be added
	 * @returns {void}
	 */
	addChunkRuntimeRequirements(chunk, items) {
		const cgc = this._getChunkGraphChunk(chunk);
		const runtimeRequirements = cgc.runtimeRequirements;
		for (const item of items) runtimeRequirements.add(item);
	}

	/**
	 * @param {Module} module the module
	 * @returns {Set<string>} runtime requirements
	 */
	getModuleRuntimeRequirements(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.runtimeRequirements;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Set<string>} runtime requirements
	 */
	getChunkRuntimeRequirements(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.runtimeRequirements;
	}

	// TODO remove in webpack 6
	/**
	 * @param {Module} module the module
	 * @param {string} deprecateMessage message for the deprecation message
	 * @returns {ChunkGraph} the chunk graph
	 */
	static getChunkGraphForModule(module, deprecateMessage) {
		const fn = deprecateGetChunkGraphForModuleMap.get(deprecateMessage);
		if (fn) return fn(module);
		const newFn = util.deprecate(
			/**
			 * @param {Module} module the module
			 * @returns {ChunkGraph} the chunk graph
			 */
			module => {
				const chunkGraph = chunkGraphForModuleMap.get(module);
				if (!chunkGraph)
					throw new Error(
						deprecateMessage +
							": There was no ChunkGraph assigned to the Module for backward-compat (Use the new API)"
					);
				return chunkGraph;
			},
			deprecateMessage + ": Use new ChunkGraph API"
		);
		deprecateGetChunkGraphForModuleMap.set(deprecateMessage, newFn);
		return newFn(module);
	}

	// TODO remove in webpack 6
	/**
	 * @param {Module} module the module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	static setChunkGraphForModule(module, chunkGraph) {
		chunkGraphForModuleMap.set(module, chunkGraph);
	}

	// TODO remove in webpack 6
	/**
	 * @param {Chunk} chunk the chunk
	 * @param {string} deprecateMessage message for the deprecation message
	 * @returns {ChunkGraph} the chunk graph
	 */
	static getChunkGraphForChunk(chunk, deprecateMessage) {
		const fn = deprecateGetChunkGraphForChunkMap.get(deprecateMessage);
		if (fn) return fn(chunk);
		const newFn = util.deprecate(
			/**
			 * @param {Chunk} chunk the chunk
			 * @returns {ChunkGraph} the chunk graph
			 */
			chunk => {
				const chunkGraph = chunkGraphForChunkMap.get(chunk);
				if (!chunkGraph)
					throw new Error(
						deprecateMessage +
							"There was no ChunkGraph assigned to the Chunk for backward-compat (Use the new API)"
					);
				return chunkGraph;
			},
			deprecateMessage + ": Use new ChunkGraph API"
		);
		deprecateGetChunkGraphForChunkMap.set(deprecateMessage, newFn);
		return newFn(chunk);
	}

	// TODO remove in webpack 6
	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	static setChunkGraphForChunk(chunk, chunkGraph) {
		chunkGraphForChunkMap.set(chunk, chunkGraph);
	}
}

// TODO remove in webpack 6
/** @type {WeakMap<Module, ChunkGraph>} */
const chunkGraphForModuleMap = new WeakMap();

// TODO remove in webpack 6
/** @type {WeakMap<Chunk, ChunkGraph>} */
const chunkGraphForChunkMap = new WeakMap();

// TODO remove in webpack 6
/** @type {Map<string, (module: Module) => ChunkGraph>} */
const deprecateGetChunkGraphForModuleMap = new Map();

// TODO remove in webpack 6
/** @type {Map<string, (chunk: Chunk) => ChunkGraph>} */
const deprecateGetChunkGraphForChunkMap = new Map();

module.exports = ChunkGraph;
