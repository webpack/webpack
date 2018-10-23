/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ChunkGraph = require("./ChunkGraph");
const Entrypoint = require("./Entrypoint");
const { intersect } = require("./util/SetHelpers");
const SortableSet = require("./util/SortableSet");
const { compareModulesById } = require("./util/comparators");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleReason")} ModuleReason */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 *  @typedef {Object} WithId an object who has an id property *
 *  @property {string | number} id the id of the object
 */

/**
 * Compare two Modules based on their ids for sorting
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} sort value
 */

// TODO use @callback
/** @typedef {(a: Module, b: Module) => -1|0|1} ModuleSortPredicate */
/** @typedef {(c: Chunk) => boolean} ChunkFilterPredicate */

let debugId = 1000;

/**
 * Compare two ChunkGroups based on their ids for sorting
 * @param {ChunkGroup} a chunk group
 * @param {ChunkGroup} b chunk group
 * @returns {-1|0|1} sort value
 */
const sortChunkGroupById = (a, b) => {
	if (a.id < b.id) return -1;
	if (b.id < a.id) return 1;
	return 0;
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
		/** @type {number | string | null} */
		this.id = null;
		/** @type {(number|string)[] | null} */
		this.ids = null;
		/** @type {number} */
		this.debugId = debugId++;
		/** @type {string} */
		this.name = name;
		/** @type {boolean} */
		this.preventIntegration = false;
		/** @type {string?} */
		this.filenameTemplate = undefined;
		/** @private @type {SortableSet<ChunkGroup>} */
		this._groups = new SortableSet(undefined, sortChunkGroupById);
		/** @type {string[]} */
		this.files = [];
		/** @type {boolean} */
		this.rendered = false;
		/** @type {string=} */
		this.hash = undefined;
		/** @type {Record<string, string>} */
		this.contentHash = Object.create(null);
		/** @type {string=} */
		this.renderedHash = undefined;
		/** @type {string=} */
		this.chunkReason = undefined;
		/** @type {boolean} */
		this.extraAsync = false;
		this.removedModules = undefined;
	}

	// TODO remove in webpack 6
	// BACKWARD-COMPAT START
	get entryModule() {
		const entryModules = Array.from(
			ChunkGraph.getChunkGraphForChunk(
				this,
				"Chunk.entryModule"
			).getChunkEntryModulesIterable(this)
		);
		if (entryModules.length === 0) {
			return undefined;
		} else if (entryModules.length === 1) {
			return entryModules[0];
		} else {
			throw new Error(
				"Module.entryModule: Multiple entry modules are not supported by the deprecated API (Use the new ChunkGroup API)"
			);
		}
	}

	hasEntryModule() {
		return (
			ChunkGraph.getChunkGraphForChunk(
				this,
				"Chunk.hasEntryModule"
			).getNumberOfEntryModules(this) > 0
		);
	}

	addModule(module) {
		return ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.addModule"
		).connectChunkAndModule(this, module);
	}

	removeModule(module) {
		return ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.removeModule"
		).disconnectChunkAndModule(this, module);
	}

	getNumberOfModules() {
		return ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.getNumberOfModules"
		).getNumberOfChunkModules(this);
	}

	get modulesIterable() {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.modulesIterable"
		);
		return chunkGraph.getOrderedChunkModulesIterable(
			this,
			compareModulesById(chunkGraph)
		);
	}

	compareTo(otherChunk) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.compareTo"
		);
		return chunkGraph.compareChunks(this, otherChunk);
	}

	containsModule(module) {
		return ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.containsModule"
		).isModuleInChunk(module, this);
	}

	getModules() {
		return ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.getModules"
		).getChunkModules(this);
	}

	remove() {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(this, "Chunk.remove");
		chunkGraph.disconnectChunk(this);
		this.disconnectFromGroups();
	}

	moveModule(module, otherChunk) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.moveModule"
		);
		chunkGraph.disconnectChunkAndModule(this, module);
		chunkGraph.connectChunkAndModule(otherChunk, module);
	}

	integrate(otherChunk) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.integrate"
		);
		if (!chunkGraph.canChunksBeIntegrated(this, otherChunk)) return false;
		chunkGraph.integrateChunks(this, otherChunk);
		return true;
	}

	canBeIntegrated(otherChunk) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.canBeIntegrated"
		);
		return chunkGraph.canChunksBeIntegrated(this, otherChunk);
	}

	isEmpty() {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(this, "Chunk.isEmpty");
		return chunkGraph.getNumberOfChunkModules(this) === 0;
	}

	modulesSize() {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.modulesSize"
		);
		return chunkGraph.getChunkModulesSize(this);
	}

	size(options) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(this, "Chunk.size");
		return chunkGraph.getChunkSize(this, options);
	}

	integratedSize(otherChunk, options) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.integratedSize"
		);
		return chunkGraph.getIntegratedChunksSize(this, otherChunk, options);
	}

	getChunkModuleMaps(filterFn) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.getChunkModuleMaps"
		);
		return chunkGraph.getChunkModuleMaps(this, filterFn);
	}

	hasModuleInGraph(filterFn, filterChunkFn) {
		const chunkGraph = ChunkGraph.getChunkGraphForChunk(
			this,
			"Chunk.hasModuleInGraph"
		);
		return chunkGraph.hasModuleInGraph(this, filterFn, filterChunkFn);
	}
	// BACKWARD-COMPAT END

	/**
	 * @returns {boolean} whether or not the Chunk will have a runtime
	 */
	hasRuntime() {
		for (const chunkGroup of this._groups) {
			if (
				chunkGroup.isInitial() &&
				chunkGroup instanceof Entrypoint &&
				chunkGroup.getRuntimeChunk() === this
			) {
				return true;
			}
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
	 * @returns {Iterable<ChunkGroup>} the chunkGroups that said chunk is referenced in
	 */
	get groupsIterable() {
		return this._groups;
	}

	/**
	 * @returns {void}
	 */
	disconnectFromGroups() {
		for (const chunkGroup of this._groups) {
			chunkGroup.removeChunk(this);
		}
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

	/**
	 * @param {Hash} hash hash (will be modified)
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		for (const m of chunkGraph.getOrderedChunkModulesIterable(
			this,
			compareModulesById(chunkGraph)
		)) {
			hash.update(chunkGraph.getModuleHash(m));
		}
		const entryModules = chunkGraph.getChunkEntryModulesWithChunkGroupIterable(
			this
		);
		for (const [m, chunkGroup] of entryModules) {
			hash.update("entry");
			hash.update(chunkGraph.getModuleHash(m));
			hash.update(chunkGroup.id);
		}
	}

	/**
	 * @returns {Set<Chunk>} a set of all the async chunks
	 */
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

	/**
	 * @typedef {Object} ChunkMaps
	 * @property {Record<string|number, string>} hash
	 * @property {Record<string|number, Record<string, string>>} contentHash
	 * @property {Record<string|number, string>} name
	 */

	/**
	 * @param {boolean=} realHash should the full hash or the rendered hash be used
	 * @returns {ChunkMaps} the chunk map information
	 */
	getChunkMaps(realHash) {
		/** @type {Record<string|number, string>} */
		const chunkHashMap = Object.create(null);
		/** @type {Record<string|number, Record<string, string>>} */
		const chunkContentHashMap = Object.create(null);
		/** @type {Record<string|number, string>} */
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

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {Record<string, Set<TODO>[]>} a record object of names to lists of child ids(?)
	 */
	getChildIdsByOrders(chunkGraph) {
		const lists = new Map();
		for (const group of this.groupsIterable) {
			if (group.chunks[group.chunks.length - 1] === this) {
				for (const childGroup of group.childrenIterable) {
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
		const result = Object.create(null);
		for (const [name, list] of lists) {
			list.sort((a, b) => {
				const cmp = b.order - a.order;
				if (cmp !== 0) return cmp;
				return a.group.compareTo(chunkGraph, b.group);
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

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {boolean=} includeDirectChildren include direct children (by default only children of async children are included)
	 * @returns {Record<string|number, Record<string, Set<TODO>[]>>} a record object of names to lists of child ids(?) by chunk id
	 */
	getChildIdsByOrdersMap(chunkGraph, includeDirectChildren) {
		const chunkMaps = Object.create(null);

		const addChildIdsByOrdersToMap = chunk => {
			const data = chunk.getChildIdsByOrders(chunkGraph);
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
}

module.exports = Chunk;
