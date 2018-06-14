/*
MIT License http://www.opensource.org/licenses/mit-license.php
Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");
const SortableSet = require("./util/SortableSet");
const intersect = require("./util/SetHelpers").intersect;
const GraphHelpers = require("./GraphHelpers");
let debugId = 1000;
const ERR_CHUNK_ENTRY = "Chunk.entry was removed. Use hasRuntime()";
const ERR_CHUNK_INITIAL =
	"Chunk.initial was removed. Use canBeInitial/isOnlyInitial()";

/** @typedef {import("./Module.js")} Module */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./ModuleReason.js")} ModuleReason */
/** @typedef {import("webpack-sources").Source} Source */

/**
 *  @typedef {Object} Identifiable an object who contains an identifier function property
 *  @property {() => string} identifier the resource or unique identifier of something
 */

/**
 *  @typedef {Object} WithId an object who has an id property
 *  @property {string} id the id of the object
 */

/** @typedef {(a: Module, b: Module) => -1|0|1} ModuleSortPredicate */
/** @typedef {(m: Module) => boolean} ModuleFilterPredicate */
/** @typedef {(c: Chunk) => boolean} ChunkFilterPredicate */

/**
 * @param {WithId} a object that contains an ID property
 * @param {WithId} b object that contains an ID property
 * @returns {-1|0|1} sort value
 */
const sortById = (a, b) => {
	if (a.id < b.id) return -1;
	if (b.id < a.id) return 1;
	return 0;
};

/**
 *
 * @param {Identifiable} a first object with ident fn
 * @param {Identifiable} b second object with ident fn
 * @returns {-1|0|1} The order number of the sort
 */
const sortByIdentifier = (a, b) => {
	if (a.identifier() > b.identifier()) return 1;
	if (a.identifier() < b.identifier()) return -1;
	return 0;
};

/**
 * @returns {string} a concatenation of module identifiers sorted
 * @param {SortableSet} set to pull module identifiers from
 */
const getModulesIdent = set => {
	set.sort();
	let str = "";
	for (const m of set) {
		str += m.identifier() + "#";
	}
	return str;
};

/**
 * @template T
 * @param {Set<T>} set the set to convert to array
 * @returns {Array<T>} the array returned from Array.from(set)
 */
const getArray = set => Array.from(set);

/**
 * @param {Set<Module>} set the Set to get the count/size of
 * @returns {number} the size of the modules
 */
const getModulesSize = set => {
	let size = 0;
	for (const module of set) {
		size += module.size();
	}
	return size;
};

/**
 * A Chunk is a unit of encapsulation for Modules.
 * Chunks are "rendered" into bundles that get emitted when the build completes.
 */
class Chunk {
	/**
	 * @param {string=} name of chunk being created, is optional (for subclasses)
	 */
	constructor(name) {
		/** @type {number | null} */
		this.id = null;
		/** @type {number[] | null} */
		this.ids = null;
		/** @type {number} */
		this.debugId = debugId++;
		/** @type {string} */
		this.name = name;
		/** @type {boolean} */
		this.preventIntegration = false;
		/** @type {Module=} */
		this.entryModule = undefined;
		//TODO make these typed generics for Module[] and ChunkGroup[] and their sort being (T, T): => 1,-1,0
		//See https://github.com/webpack/webpack/pull/7046
		/** @private */
		this._modules = new SortableSet(undefined, sortByIdentifier);
		/** @private */
		this._groups = new SortableSet(undefined, sortById);
		/** @type {Source[]} */
		this.files = [];
		/** @type {boolean} */
		this.rendered = false;
		/** @type {string=} */
		this.hash = undefined;
		/** @type {Object} */
		this.contentHash = Object.create(null);
		/** @type {string=} */
		this.renderedHash = undefined;
		/** @type {string=} */
		this.chunkReason = undefined;
		/** @type {boolean} */
		this.extraAsync = false;
		this.removedModules = undefined;
	}

	/**
	 * @deprecated Chunk.entry has been deprecated. Please use .hasRuntime() instead
	 * @returns {never} Throws an error trying to access this property
	 */
	get entry() {
		throw new Error(ERR_CHUNK_ENTRY);
	}

	/**
	 * @deprecated .entry has been deprecated. Please use .hasRuntime() instead
	 * @param {never} data The data that was attempting to be set
	 * @returns {never} Throws an error trying to access this property
	 */
	set entry(data) {
		throw new Error(ERR_CHUNK_ENTRY);
	}

	/**
	 * @deprecated Chunk.initial was removed. Use canBeInitial/isOnlyInitial()
	 * @returns {never} Throws an error trying to access this property
	 */
	get initial() {
		throw new Error(ERR_CHUNK_INITIAL);
	}

	/**
	 * @deprecated Chunk.initial was removed. Use canBeInitial/isOnlyInitial()
	 * @param {never} data The data attempting to be set
	 * @returns {never} Throws an error trying to access this property
	 */
	set initial(data) {
		throw new Error(ERR_CHUNK_INITIAL);
	}

	/**
	 * @returns {boolean} whether or not the Chunk will have a runtime
	 */
	hasRuntime() {
		for (const chunkGroup of this._groups) {
			// We only need to check the first one
			return chunkGroup.isInitial() && chunkGroup.getRuntimeChunk() === this;
		}
		return false;
	}

	/**
	 * @returns {boolean} whether or not this chunk can be an initial chunk
	 */
	canBeInitial() {
		for (const chunkGroup of this._groups) {
			if (chunkGroup.isInitial()) return true;
		}
		return false;
	}

	/**
	 * @returns {boolean} whether this chunk can only be an initial chunk
	 */
	isOnlyInitial() {
		if (this._groups.size <= 0) return false;
		for (const chunkGroup of this._groups) {
			if (!chunkGroup.isInitial()) return false;
		}
		return true;
	}

	/**
	 * @returns {boolean} if this chunk contains the entry module
	 */
	hasEntryModule() {
		return !!this.entryModule;
	}

	/**
	 * @param {Module} module the module that will be added to this chunk.
	 * @returns {boolean} returns true if the chunk doesn't have the module and it was added
	 */
	addModule(module) {
		if (!this._modules.has(module)) {
			this._modules.add(module);
			return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the module that will be removed from this chunk
	 * @returns {boolean} returns true if chunk exists and is successfully deleted
	 */
	removeModule(module) {
		if (this._modules.delete(module)) {
			module.removeChunk(this);
			return true;
		}
		return false;
	}

	/**
	 * @param {Module[]} modules the new modules to be set
	 * @returns {void} set new modules to this chunk and return nothing
	 */
	setModules(modules) {
		this._modules = new SortableSet(modules, sortByIdentifier);
	}

	/**
	 * @returns {number} the amount of modules in chunk
	 */
	getNumberOfModules() {
		return this._modules.size;
	}

	/**
	 * @returns {SortableSet} return the modules SortableSet for this chunk
	 */
	get modulesIterable() {
		return this._modules;
	}

	/**
	 * @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being added
	 * @returns {boolean} returns true if chunk is not apart of chunkGroup and is added successfully
	 */
	addGroup(chunkGroup) {
		if (this._groups.has(chunkGroup)) return false;
		this._groups.add(chunkGroup);
		return true;
	}

	/**
	 * @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being removed from
	 * @returns {boolean} returns true if chunk does exist in chunkGroup and is removed
	 */
	removeGroup(chunkGroup) {
		if (!this._groups.has(chunkGroup)) return false;
		this._groups.delete(chunkGroup);
		return true;
	}

	/**
	 * @param {ChunkGroup} chunkGroup the chunkGroup to check
	 * @returns {boolean} returns true if chunk has chunkGroup reference and exists in chunkGroup
	 */
	isInGroup(chunkGroup) {
		return this._groups.has(chunkGroup);
	}

	/**
	 * @returns {number} the amount of groups said chunk is in
	 */
	getNumberOfGroups() {
		return this._groups.size;
	}

	/**
	 * @returns {SortableSet} the chunkGroups that said chunk is referenced in
	 */
	get groupsIterable() {
		return this._groups;
	}

	/**
	 * @param {Chunk} otherChunk the chunk to compare itself with
	 * @returns {-1|0|1} this is a comparitor function like sort and returns -1, 0, or 1 based on sort order
	 */
	compareTo(otherChunk) {
		this._modules.sort();
		otherChunk._modules.sort();
		if (this._modules.size > otherChunk._modules.size) return -1;
		if (this._modules.size < otherChunk._modules.size) return 1;
		const a = this._modules[Symbol.iterator]();
		const b = otherChunk._modules[Symbol.iterator]();
		// eslint-disable-next-line
		while (true) {
			const aItem = a.next();
			const bItem = b.next();
			if (aItem.done) return 0;
			const aModuleIdentifier = aItem.value.identifier();
			const bModuleIdentifier = bItem.value.identifier();
			if (aModuleIdentifier < bModuleIdentifier) return -1;
			if (aModuleIdentifier > bModuleIdentifier) return 1;
		}
	}

	/**
	 * @param {Module} module Module to check
	 * @returns {boolean} returns true if module does exist in this chunk
	 */
	containsModule(module) {
		return this._modules.has(module);
	}

	getModules() {
		return this._modules.getFromCache(getArray);
	}

	getModulesIdent() {
		return this._modules.getFromUnorderedCache(getModulesIdent);
	}

	remove() {
		// cleanup modules
		// Array.from is used here to create a clone, because removeChunk modifies this._modules
		for (const module of Array.from(this._modules)) {
			module.removeChunk(this);
		}
		for (const chunkGroup of this._groups) {
			chunkGroup.removeChunk(this);
		}
	}

	/**
	 *
	 * @param {Module} module module to move
	 * @param {Chunk} otherChunk other chunk to move it to
	 * @returns {void}
	 */
	moveModule(module, otherChunk) {
		GraphHelpers.disconnectChunkAndModule(this, module);
		GraphHelpers.connectChunkAndModule(otherChunk, module);
		module.rewriteChunkInReasons(this, [otherChunk]);
	}

	/**
	 *
	 * @param {Chunk} otherChunk the chunk to integrate with
	 * @param {ModuleReason} reason reason why the module is being integrated
	 * @returns {boolean} returns true or false if integration succeeds or fails
	 */
	integrate(otherChunk, reason) {
		if (!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		// Array.from is used here to create a clone, because moveModule modifies otherChunk._modules
		for (const module of Array.from(otherChunk._modules)) {
			otherChunk.moveModule(module, this);
		}
		otherChunk._modules.clear();

		for (const chunkGroup of otherChunk._groups) {
			chunkGroup.replaceChunk(otherChunk, this);
			this.addGroup(chunkGroup);
		}
		otherChunk._groups.clear();

		if (this.name && otherChunk.name) {
			if (this.name.length !== otherChunk.name.length) {
				this.name =
					this.name.length < otherChunk.name.length
						? this.name
						: otherChunk.name;
			} else {
				this.name = this.name < otherChunk.name ? this.name : otherChunk.name;
			}
		}

		return true;
	}

	/**
	 * @param {Chunk} newChunk the new chunk that will be split out of, and then chunk raphi twil=
	 * @returns {void}
	 */
	split(newChunk) {
		for (const chunkGroup of this._groups) {
			chunkGroup.insertChunk(newChunk, this);
			newChunk.addGroup(chunkGroup);
		}
	}

	isEmpty() {
		return this._modules.size === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		for (const m of this._modules) {
			hash.update(m.hash);
		}
	}

	canBeIntegrated(otherChunk) {
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

		if (this.preventIntegration || otherChunk.preventIntegration) {
			return false;
		}

		if (this.hasRuntime() !== otherChunk.hasRuntime()) {
			if (this.hasRuntime()) {
				return isAvailable(this, otherChunk);
			} else if (otherChunk.hasRuntime()) {
				return isAvailable(otherChunk, this);
			} else {
				return false;
			}
		}

		if (this.hasEntryModule() || otherChunk.hasEntryModule()) {
			return false;
		}

		return true;
	}

	/**
	 *
	 * @param {number} size the size
	 * @param {Object} options the options passed in
	 * @returns {number} the multiplier returned
	 */
	addMultiplierAndOverhead(size, options) {
		const overhead =
			typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const multiplicator = this.canBeInitial()
			? options.entryChunkMultiplicator || 10
			: 1;

		return size * multiplicator + overhead;
	}

	/**
	 * @returns {number} the size of all modules
	 */
	modulesSize() {
		return this._modules.getFromUnorderedCache(getModulesSize);
	}

	/**
	 * @param {Object} options the size display options
	 * @returns {number} the chunk size
	 */
	size(options) {
		return this.addMultiplierAndOverhead(this.modulesSize(), options);
	}

	integratedSize(otherChunk, options) {
		// Chunk if it's possible to integrate this chunk
		if (!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		let integratedModulesSize = this.modulesSize();
		// only count modules that do not exist in this chunk!
		for (const otherModule of otherChunk._modules) {
			if (!this._modules.has(otherModule)) {
				integratedModulesSize += otherModule.size();
			}
		}

		return this.addMultiplierAndOverhead(integratedModulesSize, options);
	}

	/**
	 * @param {ModuleSortPredicate=} sortByFn a predicate function used to sort modules
	 * @returns {void}
	 */
	sortModules(sortByFn) {
		this._modules.sortWith(sortByFn || sortById);
	}

	sortItems(sortChunks) {
		this.sortModules();
	}

	getAllAsyncChunks() {
		const queue = new Set();
		const chunks = new Set();

		const initialChunks = intersect(
			Array.from(this.groupsIterable, g => new Set(g.chunks))
		);

		for (const chunkGroup of this.groupsIterable) {
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		for (const chunkGroup of queue) {
			for (const chunk of chunkGroup.chunks) {
				if (!initialChunks.has(chunk)) {
					chunks.add(chunk);
				}
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		return chunks;
	}

	getChunkMaps(realHash) {
		const chunkHashMap = Object.create(null);
		const chunkContentHashMap = Object.create(null);
		const chunkNameMap = Object.create(null);

		for (const chunk of this.getAllAsyncChunks()) {
			chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
			for (const key of Object.keys(chunk.contentHash)) {
				if (!chunkContentHashMap[key]) {
					chunkContentHashMap[key] = Object.create(null);
				}
				chunkContentHashMap[key][chunk.id] = chunk.contentHash[key];
			}
			if (chunk.name) {
				chunkNameMap[chunk.id] = chunk.name;
			}
		}

		return {
			hash: chunkHashMap,
			contentHash: chunkContentHashMap,
			name: chunkNameMap
		};
	}

	getChildIdsByOrders() {
		const lists = new Map();
		for (const group of this.groupsIterable) {
			if (group.chunks[group.chunks.length - 1] === this) {
				for (const childGroup of group.childrenIterable) {
					// TODO webpack 5 remove this check for options
					if (typeof childGroup.options === "object") {
						for (const key of Object.keys(childGroup.options)) {
							if (key.endsWith("Order")) {
								const name = key.substr(0, key.length - "Order".length);
								let list = lists.get(name);
								if (list === undefined) lists.set(name, (list = []));
								list.push({
									order: childGroup.options[key],
									group: childGroup
								});
							}
						}
					}
				}
			}
		}
		const result = Object.create(null);
		for (const [name, list] of lists) {
			list.sort((a, b) => {
				const cmp = b.order - a.order;
				if (cmp !== 0) return cmp;
				// TOOD webpack 5 remove this check of compareTo
				if (a.group.compareTo) {
					return a.group.compareTo(b.group);
				}
				return 0;
			});
			result[name] = Array.from(
				list.reduce((set, item) => {
					for (const chunk of item.group.chunks) {
						set.add(chunk.id);
					}
					return set;
				}, new Set())
			);
		}
		return result;
	}

	getChildIdsByOrdersMap(includeDirectChildren) {
		const chunkMaps = Object.create(null);

		const addChildIdsByOrdersToMap = chunk => {
			const data = chunk.getChildIdsByOrders();
			for (const key of Object.keys(data)) {
				let chunkMap = chunkMaps[key];
				if (chunkMap === undefined) {
					chunkMaps[key] = chunkMap = Object.create(null);
				}
				chunkMap[chunk.id] = data[key];
			}
		};

		if (includeDirectChildren) {
			addChildIdsByOrdersToMap(this);
		}

		for (const chunk of this.getAllAsyncChunks()) {
			addChildIdsByOrdersToMap(chunk);
		}

		return chunkMaps;
	}

	getChunkModuleMaps(filterFn) {
		const chunkModuleIdMap = Object.create(null);
		const chunkModuleHashMap = Object.create(null);

		for (const chunk of this.getAllAsyncChunks()) {
			let array;
			for (const module of chunk.modulesIterable) {
				if (filterFn(module)) {
					if (array === undefined) {
						array = [];
						chunkModuleIdMap[chunk.id] = array;
					}
					array.push(module.id);
					chunkModuleHashMap[module.id] = module.renderedHash;
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
	 *
	 * @param {ModuleFilterPredicate} filterFn predicate function used to filter modules
	 * @param {ChunkFilterPredicate} filterChunkFn predicate function used to filter chunks
	 * @returns {boolean} return true if module exists in graph
	 */
	hasModuleInGraph(filterFn, filterChunkFn) {
		const queue = new Set(this.groupsIterable);
		const chunksProcessed = new Set();

		for (const chunkGroup of queue) {
			for (const chunk of chunkGroup.chunks) {
				if (!chunksProcessed.has(chunk)) {
					chunksProcessed.add(chunk);
					if (!filterChunkFn || filterChunkFn(chunk)) {
						for (const module of chunk.modulesIterable) {
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

	toString() {
		return `Chunk[${Array.from(this._modules).join()}]`;
	}
}

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "forEachModule", {
	configurable: false,
	value: util.deprecate(function(fn) {
		this._modules.forEach(fn);
	}, "Chunk.forEachModule: Use for(const module of chunk.modulesIterable) instead")
});

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "mapModules", {
	configurable: false,
	value: util.deprecate(function(fn) {
		return Array.from(this._modules, fn);
	}, "Chunk.mapModules: Use Array.from(chunk.modulesIterable, fn) instead")
});

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "chunks", {
	configurable: false,
	get() {
		throw new Error("Chunk.chunks: Use ChunkGroup.getChildren() instead");
	},
	set() {
		throw new Error("Chunk.chunks: Use ChunkGroup.add/removeChild() instead");
	}
});

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "parents", {
	configurable: false,
	get() {
		throw new Error("Chunk.parents: Use ChunkGroup.getParents() instead");
	},
	set() {
		throw new Error("Chunk.parents: Use ChunkGroup.add/removeParent() instead");
	}
});

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "blocks", {
	configurable: false,
	get() {
		throw new Error("Chunk.blocks: Use ChunkGroup.getBlocks() instead");
	},
	set() {
		throw new Error("Chunk.blocks: Use ChunkGroup.add/removeBlock() instead");
	}
});

// TODO remove in webpack 5
Object.defineProperty(Chunk.prototype, "entrypoints", {
	configurable: false,
	get() {
		throw new Error(
			"Chunk.entrypoints: Use Chunks.groupsIterable and filter by instanceof Entrypoint instead"
		);
	},
	set() {
		throw new Error("Chunk.entrypoints: Use Chunks.addGroup instead");
	}
});

module.exports = Chunk;
