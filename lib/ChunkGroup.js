/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SortableSet = require("./util/SortableSet");
const compareLocations = require("./compareLocations");

let debugId = 5000;

const getArray = set => Array.from(set);

const sortById = (a, b) => {
	if (a.id < b.id) return -1;
	if (b.id < a.id) return 1;
	return 0;
};

const sortOrigin = (a, b) => {
	const aIdent = a.module ? a.module.identifier() : "";
	const bIdent = b.module ? b.module.identifier() : "";
	if (aIdent < bIdent) return -1;
	if (aIdent > bIdent) return 1;
	return compareLocations(a.loc, b.loc);
};

class ChunkGroup {
	constructor(options) {
		if (typeof options === "string") {
			options = { name: options };
		} else if (!options) {
			options = { name: undefined };
		}
		this.groupDebugId = debugId++;
		this.options = options;
		this._children = new SortableSet(undefined, sortById);
		this._parents = new SortableSet(undefined, sortById);
		this._blocks = new SortableSet();
		this.chunks = [];
		this.origins = [];
	}

	addOptions(options) {
		for (const key of Object.keys(options)) {
			if (this.options[key] === undefined) {
				this.options[key] = options[key];
			} else if (this.options[key] !== options[key]) {
				if (key.endsWith("Order")) {
					this.options[key] = Math.max(this.options[key], options[key]);
				} else {
					throw new Error(
						`ChunkGroup.addOptions: No option merge strategy for ${key}`
					);
				}
			}
		}
	}

	get name() {
		return this.options.name;
	}

	set name(value) {
		this.options.name = value;
	}

	/* istanbul ignore next */
	get debugId() {
		return Array.from(this.chunks, x => x.debugId).join("+");
	}

	get id() {
		return Array.from(this.chunks, x => x.id).join("+");
	}

	unshiftChunk(chunk) {
		const oldIdx = this.chunks.indexOf(chunk);
		if (oldIdx > 0) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.unshift(chunk);
		} else if (oldIdx < 0) {
			this.chunks.unshift(chunk);
			return true;
		}
		return false;
	}

	insertChunk(chunk, before) {
		const oldIdx = this.chunks.indexOf(chunk);
		const idx = this.chunks.indexOf(before);
		if (idx < 0) {
			throw new Error("before chunk not found");
		}
		if (oldIdx >= 0 && oldIdx > idx) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.splice(idx, 0, chunk);
		} else if (oldIdx < 0) {
			this.chunks.splice(idx, 0, chunk);
			return true;
		}
		return false;
	}

	pushChunk(chunk) {
		const oldIdx = this.chunks.indexOf(chunk);
		if (oldIdx >= 0) {
			return false;
		}
		this.chunks.push(chunk);
		return true;
	}

	replaceChunk(oldChunk, newChunk) {
		const oldIdx = this.chunks.indexOf(oldChunk);
		if (oldIdx < 0) return false;
		const newIdx = this.chunks.indexOf(newChunk);
		if (newIdx < 0) {
			this.chunks[oldIdx] = newChunk;
			return true;
		}
		if (newIdx < oldIdx) {
			this.chunks.splice(oldIdx, 1);
			return true;
		} else if (newIdx !== oldIdx) {
			this.chunks[oldIdx] = newChunk;
			this.chunks.splice(newIdx, 1);
			return true;
		}
	}

	removeChunk(chunk) {
		const idx = this.chunks.indexOf(chunk);
		if (idx >= 0) {
			this.chunks.splice(idx, 1);
			return true;
		}
		return false;
	}

	isInitial() {
		return false;
	}

	addChild(chunk) {
		if (this._children.has(chunk)) {
			return false;
		}
		this._children.add(chunk);
		return true;
	}

	getChildren() {
		return this._children.getFromCache(getArray);
	}

	getNumberOfChildren() {
		return this._children.size;
	}

	get childrenIterable() {
		return this._children;
	}

	removeChild(chunk) {
		if (!this._children.has(chunk)) {
			return false;
		}

		this._children.delete(chunk);
		chunk.removeParent(this);
		return true;
	}

	addParent(parentChunk) {
		if (!this._parents.has(parentChunk)) {
			this._parents.add(parentChunk);
			return true;
		}
		return false;
	}

	getParents() {
		return this._parents.getFromCache(getArray);
	}

	setParents(newParents) {
		this._parents.clear();
		for (const p of newParents) this._parents.add(p);
	}

	getNumberOfParents() {
		return this._parents.size;
	}

	hasParent(parent) {
		return this._parents.has(parent);
	}

	get parentsIterable() {
		return this._parents;
	}

	removeParent(chunk) {
		if (this._parents.delete(chunk)) {
			chunk.removeChunk(this);
			return true;
		}
		return false;
	}

	/**
	 * @return {Array} - an array containing the blocks
	 */
	getBlocks() {
		return this._blocks.getFromCache(getArray);
	}

	getNumberOfBlocks() {
		return this._blocks.size;
	}

	hasBlock(block) {
		return this._blocks.has(block);
	}

	get blocksIterable() {
		return this._blocks;
	}

	addBlock(block) {
		if (!this._blocks.has(block)) {
			this._blocks.add(block);
			return true;
		}
		return false;
	}

	addOrigin(module, loc, request) {
		this.origins.push({
			module,
			loc,
			request
		});
	}

	containsModule(module) {
		for (const chunk of this.chunks) {
			if (chunk.containsModule(module)) return true;
		}
		return false;
	}

	getFiles() {
		const files = new Set();

		for (const chunk of this.chunks) {
			for (const file of chunk.files) {
				files.add(file);
			}
		}

		return Array.from(files);
	}

	remove(reason) {
		// cleanup parents
		for (const parentChunkGroup of this._parents) {
			// remove this chunk from its parents
			parentChunkGroup._children.delete(this);

			// cleanup "sub chunks"
			for (const chunkGroup of this._children) {
				/**
				 * remove this chunk as "intermediary" and connect
				 * it "sub chunks" and parents directly
				 */
				// add parent to each "sub chunk"
				chunkGroup.addParent(parentChunkGroup);
				// add "sub chunk" to parent
				parentChunkGroup.addChild(chunkGroup);
			}
		}

		/**
		 * we need to iterate again over the children
		 * to remove this from the childs parents.
		 * This can not be done in the above loop
		 * as it is not guaranteed that `this._parents` contains anything.
		 */
		for (const chunkGroup of this._children) {
			// remove this as parent of every "sub chunk"
			chunkGroup._parents.delete(this);
		}

		// cleanup blocks
		for (const block of this._blocks) {
			block.chunkGroup = null;
		}

		// remove chunks
		for (const chunk of this.chunks) {
			chunk.removeGroup(this);
		}
	}

	sortItems() {
		this.origins.sort(sortOrigin);
		this._parents.sort();
		this._children.sort();
	}

	compareTo(otherGroup) {
		if (this.chunks.length > otherGroup.chunks.length) return -1;
		if (this.chunks.length < otherGroup.chunks.length) return 1;
		const a = this.chunks[Symbol.iterator]();
		const b = otherGroup.chunks[Symbol.iterator]();
		// eslint-disable-next-line
		while (true) {
			const aItem = a.next();
			const bItem = b.next();
			if (aItem.done) return 0;
			const cmp = aItem.value.compareTo(bItem.value);
			if (cmp !== 0) return cmp;
		}
	}

	getChildrenByOrders() {
		const lists = new Map();
		for (const childGroup of this._children) {
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
		const result = Object.create(null);
		for (const [name, list] of lists) {
			list.sort((a, b) => {
				const cmp = b.order - a.order;
				if (cmp !== 0) return cmp;
				// TOOD webpack 5 remove this check of compareTo
				if (a.group.compareTo) return a.group.compareTo(b.group);
				return 0;
			});
			result[name] = list.map(i => i.group);
		}
		return result;
	}

	checkConstraints() {
		const chunk = this;
		for (const child of chunk._children) {
			if (!child._parents.has(chunk))
				throw new Error(
					`checkConstraints: child missing parent ${chunk.debugId} -> ${
						child.debugId
					}`
				);
		}
		for (const parentChunk of chunk._parents) {
			if (!parentChunk._children.has(chunk))
				throw new Error(
					`checkConstraints: parent missing child ${parentChunk.debugId} <- ${
						chunk.debugId
					}`
				);
		}
	}
}

module.exports = ChunkGroup;
