/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SortableSet = require("./util/SortableSet");

const getArray = set => Array.from(set);

const sortById = (a, b) => {
	if(a.id < b.id) return -1;
	if(b.id < a.id) return 1;
	return 0;
};

const getId = set => {
	set.sort();
	return Array.from(set, x => x.id).join("+");
};

const getDebugId = set => {
	set.sort();
	return Array.from(set, x => x.debugId).join("+");
};

class ChunkGroup {
	constructor() {
		this._chunks = new SortableSet(undefined, sortById);
		this._parents = new SortableSet(undefined, sortById);
	}

	get debugId() {
		return this._parents.getFromUnorderedCache(getDebugId);
	}

	get id() {
		return this._parents.getFromUnorderedCache(getId);
	}

	isInitial() {
		return false;
	}

	hasRuntime() {
		return false;
	}

	hasEntryModule() {
		return false;
	}

	get modulesIterable() {
		return [];
	}

	addChunk(chunk) {
		if(this._chunks.has(chunk)) {
			return false;
		}
		this._chunks.add(chunk);
		return true;
	}

	getChunks() {
		return this._chunks.getFromCache(getArray);
	}

	getNumberOfChunks() {
		return this._chunks.size;
	}

	get chunksIterable() {
		return this._chunks;
	}

	addParent(parentChunk) {
		if(!this._parents.has(parentChunk)) {
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
		for(const p of newParents)
			this._parents.add(p);
	}

	mapParents(fn) {
		return Array.from(this._parents, fn);
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

}

module.exports = ChunkGroup;
