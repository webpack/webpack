/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Entrypoint from "./Entrypoint.js";
import { intersect } from "./util/SetHelpers.js";
import SortableSet from "./util/SortableSet.js";
import StringXor from "./util/StringXor.js";
import { compareChunkGroupsByIndex } from "./util/comparators.js";
import { mergeRuntime } from "./util/runtime.js";
/** @typedef {import("./ChunkGraph.js").default} ChunkGraph */
/** @typedef {import("./ChunkGraph.js").ChunkFilterPredicate} ChunkFilterPredicate */
/** @typedef {import("./ChunkGroup.js").default} ChunkGroup */
/** @typedef {import("./ChunkGroup.js").ChunkGroupOptions} ChunkGroupOptions */
/** @typedef {import("./Entrypoint.js").EntryOptions} EntryOptions */
/** @typedef {import("./Compilation.js").PathDataChunk} PathDataChunk */
/** @typedef {import("./TemplatedPathPlugin.js").TemplatePathFn<PathDataChunk>} ChunkFilenameTemplateFn */
/** @typedef {string | ChunkFilenameTemplateFn} ChunkFilenameTemplate */
/** @typedef {import("./util/Hash.js").default} Hash */
/** @typedef {import("./util/runtime.js").RuntimeSpec} RuntimeSpec */

/** @typedef {string | null} ChunkName */
/** @typedef {string | number} ChunkId */
/** @typedef {SortableSet<string>} IdNameHints */

/** @typedef {Set<Chunk>} Chunks */
/** @typedef {Set<Entrypoint>} Entrypoints */
/** @typedef {Set<ChunkGroup>} Queue */
/** @typedef {SortableSet<ChunkGroup>} SortableChunkGroups */
/** @typedef {Record<string, ChunkId[]>} ChunkChildIdsByOrdersMap */
/** @typedef {Record<string, ChunkChildIdsByOrdersMap>} ChunkChildIdsByOrdersMapByData */
/** @typedef {{ onChunks: Chunk[], chunks: Chunks }} ChunkChildOfTypeInOrder */

let debugId = 1000;

/**
 * A Chunk is a unit of encapsulation for Modules.
 * Chunks are "rendered" into bundles that get emitted when the build completes.
 */
class Chunk {
	/**
	 * Creates an instance of Chunk.
	 * @param {ChunkName=} name of chunk being created, is optional (for subclasses)
	 */
	constructor(name) {
		/** @type {ChunkId | null} */
		this.id = null;
		/** @type {ChunkId[] | null} */
		this.ids = null;
		/** @type {number} */
		this.debugId = debugId++;
		/** @type {ChunkName | undefined} */
		this.name = name;
		/** @type {IdNameHints} */
		this.idNameHints = new SortableSet();
		/** @type {boolean} */
		this.preventIntegration = false;
		/** @type {ChunkFilenameTemplate | undefined} */
		this.filenameTemplate = undefined;
		/** @type {ChunkFilenameTemplate | undefined} */
		this.cssFilenameTemplate = undefined;
		/**
		 * @private
		 * @type {SortableChunkGroups}
		 */
		this._groups = new SortableSet(undefined, compareChunkGroupsByIndex);
		/** @type {RuntimeSpec} */
		this.runtime = undefined;
		/** @type {Set<string>} */
		this.files = new Set();
		/** @type {Set<string>} */
		this.auxiliaryFiles = new Set();
		/** @type {boolean} */
		this.rendered = false;
		/** @type {string=} */
		this.hash = undefined;
		/** @type {Record<string, string>} */
		this.contentHash = Object.create(null);
		// Full (untruncated) content digests, so `[contenthash:<digest>]` re-encodes
		// from full entropy. Transient: repopulated by the `contentHash` hook each seal.
		/** @type {Record<string, string>} */
		this.contentHashFull = Object.create(null);
		/** @type {string=} */
		this.renderedHash = undefined;
		/** @type {string=} */
		this.chunkReason = undefined;
		/** @type {boolean} */
		this.extraAsync = false;
	}

	/**
	 * Checks whether this chunk has runtime.
	 * @returns {boolean} whether or not the Chunk will have a runtime
	 */
	hasRuntime() {
		for (const chunkGroup of this._groups) {
			if (
				chunkGroup instanceof Entrypoint &&
				chunkGroup.getRuntimeChunk() === this
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Checks whether it can be initial.
	 * @returns {boolean} whether or not this chunk can be an initial chunk
	 */
	canBeInitial() {
		for (const chunkGroup of this._groups) {
			if (chunkGroup.isInitial()) return true;
		}
		return false;
	}

	/**
	 * Checks whether this chunk is only initial.
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
	 * Gets entry options.
	 * @returns {EntryOptions | undefined} the entry options for this chunk
	 */
	getEntryOptions() {
		for (const chunkGroup of this._groups) {
			if (chunkGroup instanceof Entrypoint) {
				return chunkGroup.options;
			}
		}
		return undefined;
	}

	/**
	 * Adds the provided chunk group to the chunk.
	 * @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being added
	 * @returns {void}
	 */
	addGroup(chunkGroup) {
		this._groups.add(chunkGroup);
	}

	/**
	 * Removes the provided chunk group from the chunk.
	 * @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being removed from
	 * @returns {void}
	 */
	removeGroup(chunkGroup) {
		this._groups.delete(chunkGroup);
	}

	/**
	 * Checks whether this chunk is in group.
	 * @param {ChunkGroup} chunkGroup the chunkGroup to check
	 * @returns {boolean} returns true if chunk has chunkGroup reference and exists in chunkGroup
	 */
	isInGroup(chunkGroup) {
		return this._groups.has(chunkGroup);
	}

	/**
	 * Gets number of groups.
	 * @returns {number} the amount of groups that the said chunk is in
	 */
	getNumberOfGroups() {
		return this._groups.size;
	}

	/**
	 * Gets groups iterable.
	 * @returns {SortableChunkGroups} the chunkGroups that the said chunk is referenced in
	 */
	get groupsIterable() {
		this._groups.sort();
		return this._groups;
	}

	/**
	 * Disconnects from groups.
	 * @returns {void}
	 */
	disconnectFromGroups() {
		for (const chunkGroup of this._groups) {
			chunkGroup.removeChunk(this);
		}
	}

	/**
	 * Processes the provided new chunk.
	 * @param {Chunk} newChunk the new chunk that will be split out of
	 * @returns {void}
	 */
	split(newChunk) {
		for (const chunkGroup of this._groups) {
			chunkGroup.insertChunk(newChunk, this);
			newChunk.addGroup(chunkGroup);
		}
		for (const idHint of this.idNameHints) {
			newChunk.idNameHints.add(idHint);
		}
		newChunk.runtime = mergeRuntime(newChunk.runtime, this.runtime);
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash (will be modified)
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(
			`${this.id} ${this.ids ? this.ids.join() : ""} ${this.name || ""} `
		);
		const xor = new StringXor();
		for (const m of chunkGraph.getChunkModulesIterable(this)) {
			xor.add(chunkGraph.getModuleHash(m, this.runtime));
		}
		xor.updateHash(hash);
		const entryModules =
			chunkGraph.getChunkEntryModulesWithChunkGroupIterable(this);
		for (const [m, chunkGroup] of entryModules) {
			hash.update(
				`entry${chunkGraph.getModuleId(m)}${
					/** @type {ChunkGroup} */ (chunkGroup).id
				}`
			);
		}
	}

	/**
	 * Gets all async chunks.
	 * @returns {Chunks} a set of all the async chunks
	 */
	getAllAsyncChunks() {
		/** @type {Queue} */
		const queue = new Set();
		/** @type {Chunks} */
		const chunks = new Set();

		const initialChunks = intersect(
			Array.from(this.groupsIterable, (g) => new Set(g.chunks))
		);

		/** @type {Queue} */
		const initialQueue = new Set(this.groupsIterable);

		for (const chunkGroup of initialQueue) {
			for (const child of chunkGroup.childrenIterable) {
				if (child instanceof Entrypoint) {
					initialQueue.add(child);
				} else {
					queue.add(child);
				}
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
	 * Gets all initial chunks.
	 * @returns {Chunks} a set of all the initial chunks (including itself)
	 */
	getAllInitialChunks() {
		/** @type {Chunks} */
		const chunks = new Set();
		/** @type {Queue} */
		const queue = new Set(this.groupsIterable);
		for (const group of queue) {
			if (group.isInitial()) {
				for (const c of group.chunks) chunks.add(c);
				for (const g of group.childrenIterable) queue.add(g);
			}
		}
		return chunks;
	}

	/**
	 * Gets all referenced chunks.
	 * @returns {Chunks} a set of all the referenced chunks (including itself)
	 */
	getAllReferencedChunks() {
		/** @type {Queue} */
		const queue = new Set(this.groupsIterable);
		/** @type {Chunks} */
		const chunks = new Set();

		for (const chunkGroup of queue) {
			for (const chunk of chunkGroup.chunks) {
				chunks.add(chunk);
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		return chunks;
	}

	/**
	 * Gets all referenced async entrypoints.
	 * @returns {Entrypoints} a set of all the referenced entrypoints
	 */
	getAllReferencedAsyncEntrypoints() {
		/** @type {Queue} */
		const queue = new Set(this.groupsIterable);
		/** @type {Entrypoints} */
		const entrypoints = new Set();

		for (const chunkGroup of queue) {
			for (const entrypoint of chunkGroup.asyncEntrypointsIterable) {
				entrypoints.add(/** @type {Entrypoint} */ (entrypoint));
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		return entrypoints;
	}

	/**
	 * Checks whether this chunk has async chunks.
	 * @returns {boolean} true, if the chunk references async chunks
	 */
	hasAsyncChunks() {
		/** @type {Queue} */
		const queue = new Set();

		const initialChunks = intersect(
			Array.from(this.groupsIterable, (g) => new Set(g.chunks))
		);

		for (const chunkGroup of this.groupsIterable) {
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		for (const chunkGroup of queue) {
			for (const chunk of chunkGroup.chunks) {
				if (!initialChunks.has(chunk)) {
					return true;
				}
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}

		return false;
	}

	/**
	 * Gets child ids by orders.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {ChunkFilterPredicate=} filterFn function used to filter chunks
	 * @returns {Record<string, ChunkId[]>} a record object of names to lists of child ids(?)
	 */
	getChildIdsByOrders(chunkGraph, filterFn) {
		/** @type {Map<string, { order: number, group: ChunkGroup }[]>} */
		const lists = new Map();
		for (const group of this.groupsIterable) {
			if (group.chunks[group.chunks.length - 1] === this) {
				for (const childGroup of group.childrenIterable) {
					const edgeOptions = group.getChildOrderOptions(
						childGroup,
						chunkGraph
					);
					for (const key of Object.keys(edgeOptions)) {
						const name = key.slice(0, key.length - "Order".length);
						let list = lists.get(name);
						if (list === undefined) {
							list = [];
							lists.set(name, list);
						}
						list.push({
							order: edgeOptions[key],
							group: childGroup
						});
					}
				}
			}
		}
		/** @type {Record<string, ChunkId[]>} */
		const result = Object.create(null);
		for (const [name, list] of lists) {
			list.sort((a, b) => {
				const cmp = b.order - a.order;
				if (cmp !== 0) return cmp;
				return a.group.compareTo(chunkGraph, b.group);
			});
			/** @type {Set<ChunkId>} */
			const chunkIdSet = new Set();
			for (const item of list) {
				for (const chunk of item.group.chunks) {
					if (filterFn && !filterFn(chunk, chunkGraph)) continue;
					chunkIdSet.add(/** @type {ChunkId} */ (chunk.id));
				}
			}
			if (chunkIdSet.size > 0) {
				result[name] = [...chunkIdSet];
			}
		}
		return result;
	}

	/**
	 * Gets children of type in order.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {string} type option name
	 * @returns {ChunkChildOfTypeInOrder[] | undefined} referenced chunks for a specific type
	 */
	getChildrenOfTypeInOrder(chunkGraph, type) {
		/** @type {{ order: number, group: ChunkGroup, childGroup: ChunkGroup }[]} */
		const list = [];
		for (const group of this.groupsIterable) {
			for (const childGroup of group.childrenIterable) {
				const edgeOptions = group.getChildOrderOptions(childGroup, chunkGraph);
				const order = edgeOptions[type];
				if (order === undefined) continue;
				list.push({
					order,
					group,
					childGroup
				});
			}
		}
		if (list.length === 0) return;
		list.sort((a, b) => {
			const cmp = b.order - a.order;
			if (cmp !== 0) return cmp;
			return a.group.compareTo(chunkGraph, b.group);
		});
		/** @type {ChunkChildOfTypeInOrder[]} */
		const result = [];
		/** @type {undefined | ChunkChildOfTypeInOrder} */
		let lastEntry;
		for (const { group, childGroup } of list) {
			if (lastEntry && lastEntry.onChunks === group.chunks) {
				for (const chunk of childGroup.chunks) {
					lastEntry.chunks.add(chunk);
				}
			} else {
				result.push(
					(lastEntry = {
						onChunks: group.chunks,
						chunks: new Set(childGroup.chunks)
					})
				);
			}
		}
		return result;
	}

	/**
	 * Gets child ids by orders map.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {boolean=} includeDirectChildren include direct children (by default only children of async children are included)
	 * @param {ChunkFilterPredicate=} filterFn function used to filter chunks
	 * @returns {ChunkChildIdsByOrdersMapByData} a record object of names to lists of child ids(?) by chunk id
	 */
	getChildIdsByOrdersMap(chunkGraph, includeDirectChildren, filterFn) {
		/** @type {ChunkChildIdsByOrdersMapByData} */
		const chunkMaps = Object.create(null);

		/**
		 * Adds child ids by orders to map.
		 * @param {Chunk} chunk a chunk
		 * @returns {void}
		 */
		const addChildIdsByOrdersToMap = (chunk) => {
			const data = chunk.getChildIdsByOrders(chunkGraph, filterFn);
			for (const key of Object.keys(data)) {
				let chunkMap = chunkMaps[key];
				if (chunkMap === undefined) {
					chunkMaps[key] = chunkMap = Object.create(null);
				}
				chunkMap[/** @type {ChunkId} */ (chunk.id)] = data[key];
			}
		};

		if (includeDirectChildren) {
			/** @type {Chunks} */
			const chunks = new Set();
			for (const chunkGroup of this.groupsIterable) {
				for (const chunk of chunkGroup.chunks) {
					chunks.add(chunk);
				}
			}
			for (const chunk of chunks) {
				addChildIdsByOrdersToMap(chunk);
			}
		}

		for (const chunk of this.getAllAsyncChunks()) {
			addChildIdsByOrdersToMap(chunk);
		}

		return chunkMaps;
	}

	/**
	 * Checks whether this chunk contains the chunk graph.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {string} type option name
	 * @param {boolean=} includeDirectChildren include direct children (by default only children of async children are included)
	 * @param {ChunkFilterPredicate=} filterFn function used to filter chunks
	 * @returns {boolean} true when the child is of type order, otherwise false
	 */
	hasChildByOrder(chunkGraph, type, includeDirectChildren, filterFn) {
		if (includeDirectChildren) {
			/** @type {Chunks} */
			const chunks = new Set();
			for (const chunkGroup of this.groupsIterable) {
				for (const chunk of chunkGroup.chunks) {
					chunks.add(chunk);
				}
			}
			for (const chunk of chunks) {
				const data = chunk.getChildIdsByOrders(chunkGraph, filterFn);
				if (data[type] !== undefined) return true;
			}
		}

		for (const chunk of this.getAllAsyncChunks()) {
			const data = chunk.getChildIdsByOrders(chunkGraph, filterFn);
			if (data[type] !== undefined) return true;
		}

		return false;
	}
}

export default Chunk;

export { Chunk as "module.exports" };
