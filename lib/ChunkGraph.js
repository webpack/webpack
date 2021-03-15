/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const { first } = require("./util/SetHelpers");
const SortableSet = require("./util/SortableSet");
const StringXor = require("./util/StringXor");
const {
	compareModulesById,
	compareIterables,
	compareModulesByIdentifier,
	concatComparators,
	compareSelect,
	compareIds
} = require("./util/comparators");
const createHash = require("./util/createHash");
const findGraphRoots = require("./util/findGraphRoots");
const {
	RuntimeSpecMap,
	RuntimeSpecSet,
	runtimeToString,
	mergeRuntime,
	forEachRuntime
} = require("./util/runtime");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RuntimeModule")} RuntimeModule */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/** @type {ReadonlySet<string>} */
const EMPTY_SET = new Set();

const compareModuleIterables = compareIterables(compareModulesByIdentifier);

/** @typedef {(c: Chunk, chunkGraph: ChunkGraph) => boolean} ChunkFilterPredicate */
/** @typedef {(m: Module) => boolean} ModuleFilterPredicate */

/**
 * @typedef {Object} ChunkSizeOptions
 * @property {number=} chunkOverhead constant overhead for a chunk
 * @property {number=} entryChunkMultiplicator multiplicator for initial chunks
 */

class ModuleHashInfo {
	constructor(hash, renderedHash) {
		this.hash = hash;
		this.renderedHash = renderedHash;
	}
}

/** @template T @typedef {(set: SortableSet<T>) => T[]} SetToArrayFunction<T> */

/**
 * @template T
 * @param {SortableSet<T>} set the set
 * @returns {T[]} set as array
 */
const getArray = set => {
	return Array.from(set);
};

/**
 * @param {SortableSet<Chunk>} chunks the chunks
 * @returns {RuntimeSpecSet} runtimes
 */
const getModuleRuntimes = chunks => {
	const runtimes = new RuntimeSpecSet();
	for (const chunk of chunks) {
		runtimes.add(chunk.runtime);
	}
	return runtimes;
};

/**
 * @param {SortableSet<Module>} set the set
 * @returns {Map<string, SortableSet<Module>>} modules by source type
 */
const modulesBySourceType = set => {
	/** @type {Map<string, SortableSet<Module>>} */
	const map = new Map();
	for (const module of set) {
		for (const sourceType of module.getSourceTypes()) {
			let innerSet = map.get(sourceType);
			if (innerSet === undefined) {
				innerSet = new SortableSet();
				map.set(sourceType, innerSet);
			}
			innerSet.add(module);
		}
	}
	for (const [key, innerSet] of map) {
		// When all modules have the source type, we reuse the original SortableSet
		// to benefit from the shared cache (especially for sorting)
		if (innerSet.size === set.size) {
			map.set(key, set);
		}
	}
	return map;
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
 * @param {Iterable<Module>} modules the modules to get the count/size of
 * @returns {number} the size of the modules
 */
const getModulesSize = modules => {
	let size = 0;
	for (const module of modules) {
		for (const type of module.getSourceTypes()) {
			size += module.size(type);
		}
	}
	return size;
};

/**
 * @param {Iterable<Module>} modules the sortable Set to get the size of
 * @returns {Record<string, number>} the sizes of the modules
 */
const getModulesSizes = modules => {
	let sizes = Object.create(null);
	for (const module of modules) {
		for (const type of module.getSourceTypes()) {
			sizes[type] = (sizes[type] || 0) + module.size(type);
		}
	}
	return sizes;
};

/**
 * @param {Chunk} a chunk
 * @param {Chunk} b chunk
 * @returns {boolean} true, if a is always a parent of b
 */
const isAvailableChunk = (a, b) => {
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

class ChunkGraphModule {
	constructor() {
		/** @type {SortableSet<Chunk>} */
		this.chunks = new SortableSet();
		/** @type {Set<Chunk> | undefined} */
		this.entryInChunks = undefined;
		/** @type {Set<Chunk> | undefined} */
		this.runtimeInChunks = undefined;
		/** @type {RuntimeSpecMap<ModuleHashInfo>} */
		this.hashes = undefined;
		/** @type {string | number} */
		this.id = null;
		/** @type {RuntimeSpecMap<Set<string>> | undefined} */
		this.runtimeRequirements = undefined;
		/** @type {RuntimeSpecMap<string>} */
		this.graphHashes = undefined;
		/** @type {RuntimeSpecMap<string>} */
		this.graphHashesWithConnections = undefined;
	}
}

class ChunkGraphChunk {
	constructor() {
		/** @type {SortableSet<Module>} */
		this.modules = new SortableSet();
		/** @type {Map<Module, Entrypoint>} */
		this.entryModules = new Map();
		/** @type {SortableSet<RuntimeModule>} */
		this.runtimeModules = new SortableSet();
		/** @type {Set<RuntimeModule> | undefined} */
		this.fullHashModules = undefined;
		/** @type {Set<string> | undefined} */
		this.runtimeRequirements = undefined;
		/** @type {Set<string>} */
		this.runtimeRequirementsInTree = new Set();
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
		/** @private @type {Map<string, string | number>} */
		this._runtimeIds = new Map();
		/** @type {ModuleGraph} */
		this.moduleGraph = moduleGraph;

		this._getGraphRoots = this._getGraphRoots.bind(this);

		// Caching
		this._cacheChunkGraphModuleKey1 = undefined;
		this._cacheChunkGraphModuleValue1 = undefined;
		this._cacheChunkGraphModuleKey2 = undefined;
		this._cacheChunkGraphModuleValue2 = undefined;
		this._cacheChunkGraphChunkKey1 = undefined;
		this._cacheChunkGraphChunkValue1 = undefined;
		this._cacheChunkGraphChunkKey2 = undefined;
		this._cacheChunkGraphChunkValue2 = undefined;
	}

	/**
	 * @private
	 * @param {Module} module the module
	 * @returns {ChunkGraphModule} internal module
	 */
	_getChunkGraphModule(module) {
		if (this._cacheChunkGraphModuleKey1 === module)
			return this._cacheChunkGraphModuleValue1;
		if (this._cacheChunkGraphModuleKey2 === module)
			return this._cacheChunkGraphModuleValue2;
		let cgm = this._modules.get(module);
		if (cgm === undefined) {
			cgm = new ChunkGraphModule();
			this._modules.set(module, cgm);
		}
		this._cacheChunkGraphModuleKey2 = this._cacheChunkGraphModuleKey1;
		this._cacheChunkGraphModuleValue2 = this._cacheChunkGraphModuleValue1;
		this._cacheChunkGraphModuleKey1 = module;
		this._cacheChunkGraphModuleValue1 = cgm;
		return cgm;
	}

	/**
	 * @private
	 * @param {Chunk} chunk the chunk
	 * @returns {ChunkGraphChunk} internal chunk
	 */
	_getChunkGraphChunk(chunk) {
		if (this._cacheChunkGraphChunkKey1 === chunk)
			return this._cacheChunkGraphChunkValue1;
		if (this._cacheChunkGraphChunkKey2 === chunk)
			return this._cacheChunkGraphChunkValue2;
		let cgc = this._chunks.get(chunk);
		if (cgc === undefined) {
			cgc = new ChunkGraphChunk();
			this._chunks.set(chunk, cgc);
		}
		this._cacheChunkGraphChunkKey2 = this._cacheChunkGraphChunkKey1;
		this._cacheChunkGraphChunkValue2 = this._cacheChunkGraphChunkValue1;
		this._cacheChunkGraphChunkKey1 = chunk;
		this._cacheChunkGraphChunkValue1 = cgc;
		return cgc;
	}

	/**
	 * @param {SortableSet<Module>} set the sortable Set to get the roots of
	 * @returns {Module[]} the graph roots
	 */
	_getGraphRoots(set) {
		const { moduleGraph } = this;
		return Array.from(
			findGraphRoots(set, module => {
				/** @type {Set<Module>} */
				const set = new Set();
				const addDependencies = module => {
					for (const connection of moduleGraph.getOutgoingConnections(module)) {
						if (!connection.module) continue;
						const activeState = connection.getActiveState(undefined);
						if (activeState === false) continue;
						if (activeState === ModuleGraphConnection.TRANSITIVE_ONLY) {
							addDependencies(connection.module);
							continue;
						}
						set.add(connection.module);
					}
				};
				addDependencies(module);
				return set;
			})
		).sort(compareModulesByIdentifier);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the module
	 * @returns {void}
	 */
	connectChunkAndModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.chunks.add(chunk);
		cgc.modules.add(module);
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
		ChunkGraph.clearChunkGraphForChunk(chunk);
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
	 * @param {Chunk} chunk the chunk
	 * @param {Iterable<RuntimeModule>} modules the runtime modules
	 * @returns {void}
	 */
	attachRuntimeModules(chunk, modules) {
		const cgc = this._getChunkGraphChunk(chunk);
		for (const module of modules) {
			cgc.runtimeModules.add(module);
		}
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Iterable<RuntimeModule>} modules the modules that require a full hash
	 * @returns {void}
	 */
	attachFullHashModules(chunk, modules) {
		const cgc = this._getChunkGraphChunk(chunk);
		if (cgc.fullHashModules === undefined) cgc.fullHashModules = new Set();
		for (const module of modules) {
			cgc.fullHashModules.add(module);
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

		if (oldCgm.entryInChunks !== undefined) {
			if (newCgm.entryInChunks === undefined) {
				newCgm.entryInChunks = new Set();
			}
			for (const chunk of oldCgm.entryInChunks) {
				const cgc = this._getChunkGraphChunk(chunk);
				const old = cgc.entryModules.get(oldModule);
				/** @type {Map<Module, Entrypoint>} */
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
			oldCgm.entryInChunks = undefined;
		}

		if (oldCgm.runtimeInChunks !== undefined) {
			if (newCgm.runtimeInChunks === undefined) {
				newCgm.runtimeInChunks = new Set();
			}
			for (const chunk of oldCgm.runtimeInChunks) {
				const cgc = this._getChunkGraphChunk(chunk);
				cgc.runtimeModules.delete(/** @type {RuntimeModule} */ (oldModule));
				cgc.runtimeModules.add(/** @type {RuntimeModule} */ (newModule));
				newCgm.runtimeInChunks.add(chunk);
				if (
					cgc.fullHashModules !== undefined &&
					cgc.fullHashModules.has(/** @type {RuntimeModule} */ (oldModule))
				) {
					cgc.fullHashModules.delete(/** @type {RuntimeModule} */ (oldModule));
					cgc.fullHashModules.add(/** @type {RuntimeModule} */ (newModule));
				}
			}
			oldCgm.runtimeInChunks = undefined;
		}
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
		return cgm.entryInChunks !== undefined;
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
	 * @param {Module} module the module
	 * @returns {RuntimeSpecSet} runtimes
	 */
	getModuleRuntimes(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks.getFromUnorderedCache(getModuleRuntimes);
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
	 * @param {string} sourceType source type
	 * @returns {Iterable<Module> | undefined} return the modules for this chunk
	 */
	getChunkModulesIterableBySourceType(chunk, sourceType) {
		const cgc = this._getChunkGraphChunk(chunk);
		const modulesWithSourceType = cgc.modules
			.getFromUnorderedCache(modulesBySourceType)
			.get(sourceType);
		return modulesWithSourceType;
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
	 * @param {string} sourceType source type
	 * @param {function(Module, Module): -1|0|1} comparator comparator function
	 * @returns {Iterable<Module> | undefined} return the modules for this chunk
	 */
	getOrderedChunkModulesIterableBySourceType(chunk, sourceType, comparator) {
		const cgc = this._getChunkGraphChunk(chunk);
		const modulesWithSourceType = cgc.modules
			.getFromUnorderedCache(modulesBySourceType)
			.get(sourceType);
		if (modulesWithSourceType === undefined) return undefined;
		modulesWithSourceType.sortWith(comparator);
		return modulesWithSourceType;
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
	 * @param {boolean} includeAllChunks all chunks or only async chunks
	 * @returns {Record<string|number, (string|number)[]>} chunk to module ids object
	 */
	getChunkModuleIdMap(chunk, filterFn, includeAllChunks = false) {
		/** @type {Record<string|number, (string|number)[]>} */
		const chunkModuleIdMap = Object.create(null);

		for (const asyncChunk of includeAllChunks
			? chunk.getAllReferencedChunks()
			: chunk.getAllAsyncChunks()) {
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
				}
			}
		}

		return chunkModuleIdMap;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ModuleFilterPredicate} filterFn function used to filter modules
	 * @param {number} hashLength length of the hash
	 * @param {boolean} includeAllChunks all chunks or only async chunks
	 * @returns {Record<string|number, Record<string|number, string>>} chunk to module id to module hash object
	 */
	getChunkModuleRenderedHashMap(
		chunk,
		filterFn,
		hashLength = 0,
		includeAllChunks = false
	) {
		/** @type {Record<string|number, Record<string|number, string>>} */
		const chunkModuleHashMap = Object.create(null);

		for (const asyncChunk of includeAllChunks
			? chunk.getAllReferencedChunks()
			: chunk.getAllAsyncChunks()) {
			/** @type {Record<string|number, string>} */
			let idToHashMap;
			for (const module of this.getOrderedChunkModulesIterable(
				asyncChunk,
				compareModulesById(this)
			)) {
				if (filterFn(module)) {
					if (idToHashMap === undefined) {
						idToHashMap = Object.create(null);
						chunkModuleHashMap[asyncChunk.id] = idToHashMap;
					}
					const moduleId = this.getModuleId(module);
					const hash = this.getRenderedModuleHash(module, asyncChunk.runtime);
					idToHashMap[moduleId] = hashLength ? hash.slice(0, hashLength) : hash;
				}
			}
		}

		return chunkModuleHashMap;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ChunkFilterPredicate} filterFn function used to filter chunks
	 * @returns {Record<string|number, boolean>} chunk map
	 */
	getChunkConditionMap(chunk, filterFn) {
		const map = Object.create(null);
		for (const c of chunk.getAllReferencedChunks()) {
			map[c.id] = filterFn(c, this);
		}
		return map;
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
					if (!filterChunkFn || filterChunkFn(innerChunk, this)) {
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
	 * @returns {Record<string, number>} total sizes of all modules in the chunk by source type
	 */
	getChunkModulesSizes(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.getFromUnorderedCache(getModulesSizes);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Module[]} root modules of the chunks (ordered by identifier)
	 */
	getChunkRootModules(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.modules.getFromUnorderedCache(this._getGraphRoots);
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ChunkSizeOptions} options options object
	 * @returns {number} total size of the chunk
	 */
	getChunkSize(chunk, options = {}) {
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
	getIntegratedChunksSize(chunkA, chunkB, options = {}) {
		const cgcA = this._getChunkGraphChunk(chunkA);
		const cgcB = this._getChunkGraphChunk(chunkB);
		const allModules = new Set(cgcA.modules);
		for (const m of cgcB.modules) allModules.add(m);
		let modulesSize = getModulesSize(allModules);
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
		if (chunkA.preventIntegration || chunkB.preventIntegration) {
			return false;
		}

		const hasRuntimeA = chunkA.hasRuntime();
		const hasRuntimeB = chunkB.hasRuntime();

		if (hasRuntimeA !== hasRuntimeB) {
			if (hasRuntimeA) {
				return isAvailableChunk(chunkA, chunkB);
			} else if (hasRuntimeB) {
				return isAvailableChunk(chunkB, chunkA);
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

		// Merge id name hints
		for (const hint of chunkB.idNameHints) {
			chunkA.idNameHints.add(hint);
		}

		// Merge runtime
		chunkA.runtime = mergeRuntime(chunkA.runtime, chunkB.runtime);

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
		ChunkGraph.clearChunkGraphForChunk(chunkB);
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
	 * @param {Entrypoint=} entrypoint the chunk group which must be loaded before the module is executed
	 * @returns {void}
	 */
	connectChunkAndEntryModule(chunk, module, entrypoint) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		if (cgm.entryInChunks === undefined) {
			cgm.entryInChunks = new Set();
		}
		cgm.entryInChunks.add(chunk);
		cgc.entryModules.set(module, entrypoint);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {RuntimeModule} module the runtime module
	 * @returns {void}
	 */
	connectChunkAndRuntimeModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		if (cgm.runtimeInChunks === undefined) {
			cgm.runtimeInChunks = new Set();
		}
		cgm.runtimeInChunks.add(chunk);
		cgc.runtimeModules.add(module);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {RuntimeModule} module the module that require a full hash
	 * @returns {void}
	 */
	addFullHashModuleToChunk(chunk, module) {
		const cgc = this._getChunkGraphChunk(chunk);
		if (cgc.fullHashModules === undefined) cgc.fullHashModules = new Set();
		cgc.fullHashModules.add(module);
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
		if (cgm.entryInChunks.size === 0) {
			cgm.entryInChunks = undefined;
		}
		cgc.entryModules.delete(module);
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {RuntimeModule} module the runtime module
	 * @returns {void}
	 */
	disconnectChunkAndRuntimeModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		const cgc = this._getChunkGraphChunk(chunk);
		cgm.runtimeInChunks.delete(chunk);
		if (cgm.runtimeInChunks.size === 0) {
			cgm.runtimeInChunks = undefined;
		}
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
		cgm.entryInChunks = undefined;
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
			if (cgm.entryInChunks.size === 0) {
				cgm.entryInChunks = undefined;
			}
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
	 * @returns {Iterable<Chunk>} iterable of chunks
	 */
	getChunkEntryDependentChunksIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		/** @type {Set<Chunk>} */
		const set = new Set();
		for (const chunkGroup of cgc.entryModules.values()) {
			for (const c of chunkGroup.chunks) {
				if (c !== chunk && !c.hasRuntime()) {
					set.add(c);
				}
			}
		}
		return set;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {boolean} true, when it has dependent chunks
	 */
	hasChunkEntryDependentChunks(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		for (const chunkGroup of cgc.entryModules.values()) {
			for (const c of chunkGroup.chunks) {
				if (c !== chunk) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<RuntimeModule>} iterable of modules (do not modify)
	 */
	getChunkRuntimeModulesIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.runtimeModules;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {RuntimeModule[]} array of modules in order of execution
	 */
	getChunkRuntimeModulesInOrder(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		const array = Array.from(cgc.runtimeModules);
		array.sort(
			concatComparators(
				compareSelect(
					/**
					 * @param {RuntimeModule} r runtime module
					 * @returns {number=} stage
					 */
					r => r.stage,
					compareIds
				),
				compareModulesByIdentifier
			)
		);
		return array;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<RuntimeModule> | undefined} iterable of modules (do not modify)
	 */
	getChunkFullHashModulesIterable(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.fullHashModules;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {ReadonlySet<RuntimeModule> | undefined} set of modules (do not modify)
	 */
	getChunkFullHashModulesSet(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.fullHashModules;
	}

	/** @typedef {[Module, Entrypoint | undefined]} EntryModuleWithChunkGroup */

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
	 * @param {string} runtime runtime
	 * @returns {string | number} the id of the runtime
	 */
	getRuntimeId(runtime) {
		return this._runtimeIds.get(runtime);
	}

	/**
	 * @param {string} runtime runtime
	 * @param {string | number} id the id of the runtime
	 * @returns {void}
	 */
	setRuntimeId(runtime, id) {
		this._runtimeIds.set(runtime, id);
	}

	/**
	 * @template T
	 * @param {Module} module the module
	 * @param {RuntimeSpecMap<T>} hashes hashes data
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {T} hash
	 */
	_getModuleHashInfo(module, hashes, runtime) {
		if (!hashes) {
			throw new Error(
				`Module ${module.identifier()} has no hash info for runtime ${runtimeToString(
					runtime
				)} (hashes not set at all)`
			);
		} else if (runtime === undefined) {
			const hashInfoItems = new Set(hashes.values());
			if (hashInfoItems.size !== 1) {
				throw new Error(
					`No unique hash info entry for unspecified runtime for ${module.identifier()} (existing runtimes: ${Array.from(
						hashes.keys(),
						r => runtimeToString(r)
					).join(", ")}).
Caller might not support runtime-dependent code generation (opt-out via optimization.usedExports: "global").`
				);
			}
			return first(hashInfoItems);
		} else {
			const hashInfo = hashes.get(runtime);
			if (!hashInfo) {
				throw new Error(
					`Module ${module.identifier()} has no hash info for runtime ${runtimeToString(
						runtime
					)} (available runtimes ${Array.from(
						hashes.keys(),
						runtimeToString
					).join(", ")})`
				);
			}
			return hashInfo;
		}
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, if the module has hashes for this runtime
	 */
	hasModuleHashes(module, runtime) {
		const cgm = this._getChunkGraphModule(module);
		const hashes = cgm.hashes;
		return hashes && hashes.has(runtime);
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {string} hash
	 */
	getModuleHash(module, runtime) {
		const cgm = this._getChunkGraphModule(module);
		const hashes = cgm.hashes;
		return this._getModuleHashInfo(module, hashes, runtime).hash;
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {string} hash
	 */
	getRenderedModuleHash(module, runtime) {
		const cgm = this._getChunkGraphModule(module);
		const hashes = cgm.hashes;
		return this._getModuleHashInfo(module, hashes, runtime).renderedHash;
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {string} hash the full hash
	 * @param {string} renderedHash the shortened hash for rendering
	 * @returns {void}
	 */
	setModuleHashes(module, runtime, hash, renderedHash) {
		const cgm = this._getChunkGraphModule(module);
		if (cgm.hashes === undefined) {
			cgm.hashes = new RuntimeSpecMap();
		}
		cgm.hashes.set(runtime, new ModuleHashInfo(hash, renderedHash));
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {Set<string>} items runtime requirements to be added (ownership of this Set is given to ChunkGraph)
	 * @returns {void}
	 */
	addModuleRuntimeRequirements(module, runtime, items) {
		const cgm = this._getChunkGraphModule(module);
		const runtimeRequirementsMap = cgm.runtimeRequirements;
		if (runtimeRequirementsMap === undefined) {
			const map = new RuntimeSpecMap();
			map.set(runtime, items);
			cgm.runtimeRequirements = map;
			return;
		}
		runtimeRequirementsMap.update(runtime, runtimeRequirements => {
			if (runtimeRequirements === undefined) {
				return items;
			} else if (runtimeRequirements.size >= items.size) {
				for (const item of items) runtimeRequirements.add(item);
				return runtimeRequirements;
			} else {
				for (const item of runtimeRequirements) items.add(item);
				return items;
			}
		});
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Set<string>} items runtime requirements to be added (ownership of this Set is given to ChunkGraph)
	 * @returns {void}
	 */
	addChunkRuntimeRequirements(chunk, items) {
		const cgc = this._getChunkGraphChunk(chunk);
		const runtimeRequirements = cgc.runtimeRequirements;
		if (runtimeRequirements === undefined) {
			cgc.runtimeRequirements = items;
		} else if (runtimeRequirements.size >= items.size) {
			for (const item of items) runtimeRequirements.add(item);
		} else {
			for (const item of runtimeRequirements) items.add(item);
			cgc.runtimeRequirements = items;
		}
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Iterable<string>} items runtime requirements to be added
	 * @returns {void}
	 */
	addTreeRuntimeRequirements(chunk, items) {
		const cgc = this._getChunkGraphChunk(chunk);
		const runtimeRequirements = cgc.runtimeRequirementsInTree;
		for (const item of items) runtimeRequirements.add(item);
	}

	/**
	 * @param {Module} module the module
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {ReadonlySet<string>} runtime requirements
	 */
	getModuleRuntimeRequirements(module, runtime) {
		const cgm = this._getChunkGraphModule(module);
		const runtimeRequirements =
			cgm.runtimeRequirements && cgm.runtimeRequirements.get(runtime);
		return runtimeRequirements === undefined ? EMPTY_SET : runtimeRequirements;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {ReadonlySet<string>} runtime requirements
	 */
	getChunkRuntimeRequirements(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		const runtimeRequirements = cgc.runtimeRequirements;
		return runtimeRequirements === undefined ? EMPTY_SET : runtimeRequirements;
	}

	getModuleGraphHash(module, runtime, withConnections = true) {
		const cgm = this._getChunkGraphModule(module);
		if (cgm.graphHashes === undefined) {
			cgm.graphHashes = new RuntimeSpecMap();
		}
		const graphHash = cgm.graphHashes.provide(runtime, () => {
			const hash = createHash("md4");
			hash.update(`${cgm.id}`);
			hash.update(`${this.moduleGraph.isAsync(module)}`);
			this.moduleGraph.getExportsInfo(module).updateHash(hash, runtime);
			return /** @type {string} */ (hash.digest("hex"));
		});
		if (!withConnections) return graphHash;
		if (cgm.graphHashesWithConnections === undefined) {
			cgm.graphHashesWithConnections = new RuntimeSpecMap();
		}
		const activeStateToString = state => {
			if (state === false) return "false";
			if (state === true) return "true";
			if (state === ModuleGraphConnection.TRANSITIVE_ONLY) return "transitive";
			throw new Error("Not implemented active state");
		};
		const strict = module.buildMeta && module.buildMeta.strictHarmonyModule;
		return cgm.graphHashesWithConnections.provide(runtime, () => {
			const connections = this.moduleGraph.getOutgoingConnections(module);
			/** @type {Map<string, Module | Set<Module>>} */
			const connectedModules = new Map();
			for (const connection of connections) {
				let stateInfo;
				if (typeof runtime === "string") {
					const state = connection.getActiveState(runtime);
					if (state === false) continue;
					stateInfo = activeStateToString(state);
				} else {
					const states = new Set();
					stateInfo = "";
					forEachRuntime(
						runtime,
						runtime => {
							const state = connection.getActiveState(runtime);
							states.add(state);
							stateInfo += runtime + activeStateToString(state);
						},
						true
					);
					if (states.size === 1) {
						const state = first(states);
						if (state === false) continue;
						stateInfo = activeStateToString(state);
					}
				}
				const module = connection.module;
				stateInfo += module.getExportsType(this.moduleGraph, strict);
				const oldModule = connectedModules.get(stateInfo);
				if (oldModule === undefined) {
					connectedModules.set(stateInfo, module);
				} else if (oldModule instanceof Set) {
					oldModule.add(module);
				} else if (oldModule !== module) {
					connectedModules.set(stateInfo, new Set([oldModule, module]));
				}
			}
			if (connectedModules.size === 0) return graphHash;
			const connectedModulesInOrder =
				connectedModules.size > 1
					? Array.from(connectedModules).sort(([a], [b]) => (a < b ? -1 : 1))
					: connectedModules;
			const hash = createHash("md4");
			for (const [stateInfo, modules] of connectedModulesInOrder) {
				hash.update(stateInfo);
				if (modules instanceof Set) {
					const xor = new StringXor();
					for (const m of modules) {
						xor.add(this.getModuleGraphHash(m, runtime, false));
					}
					xor.updateHash(hash);
				} else {
					hash.update(this.getModuleGraphHash(modules, runtime, false));
				}
			}
			hash.update(graphHash);
			return /** @type {string} */ (hash.digest("hex"));
		});
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {ReadonlySet<string>} runtime requirements
	 */
	getTreeRuntimeRequirements(chunk) {
		const cgc = this._getChunkGraphChunk(chunk);
		return cgc.runtimeRequirementsInTree;
	}

	// TODO remove in webpack 6
	/**
	 * @param {Module} module the module
	 * @param {string} deprecateMessage message for the deprecation message
	 * @param {string} deprecationCode code for the deprecation
	 * @returns {ChunkGraph} the chunk graph
	 */
	static getChunkGraphForModule(module, deprecateMessage, deprecationCode) {
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
			deprecateMessage + ": Use new ChunkGraph API",
			deprecationCode
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
	 * @param {Module} module the module
	 * @returns {void}
	 */
	static clearChunkGraphForModule(module) {
		chunkGraphForModuleMap.delete(module);
	}

	// TODO remove in webpack 6
	/**
	 * @param {Chunk} chunk the chunk
	 * @param {string} deprecateMessage message for the deprecation message
	 * @param {string} deprecationCode code for the deprecation
	 * @returns {ChunkGraph} the chunk graph
	 */
	static getChunkGraphForChunk(chunk, deprecateMessage, deprecationCode) {
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
			deprecateMessage + ": Use new ChunkGraph API",
			deprecationCode
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

	// TODO remove in webpack 6
	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {void}
	 */
	static clearChunkGraphForChunk(chunk) {
		chunkGraphForChunkMap.delete(chunk);
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
