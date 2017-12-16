/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");
const compareLocations = require("./compareLocations");
const SortableSet = require("./util/SortableSet");
let debugId = 1000;

const sortById = (a, b) => {
	if(a.id < b.id) return -1;
	if(b.id < a.id) return 1;
	return 0;
};

const sortByIdentifier = (a, b) => {
	if(a.identifier() > b.identifier()) return 1;
	if(a.identifier() < b.identifier()) return -1;
	return 0;
};

const getFrozenArray = set => Object.freeze(Array.from(set));

const getModulesIdent = set => {
	set.sort();
	let str = "";
	set.forEach(m => {
		str += m.identifier() + "#";
	});
	return str;
};

const getArray = set => Array.from(set);

const getModulesSize = set => {
	let count = 0;
	for(const module of set) {
		count += module.size();
	}
	return count;
};

class Chunk {

	constructor(name, module, loc) {
		this.id = null;
		this.ids = null;
		this.debugId = debugId++;
		this.name = name;
		this.entryModule = undefined;
		this._modules = new SortableSet(undefined, sortByIdentifier);
		this._entrypoints = new SortableSet();
		this._chunks = new SortableSet(undefined, sortById);
		this._parents = new SortableSet(undefined, sortById);
		this._blocks = new SortableSet();
		this.origins = [];
		this.files = [];
		this.rendered = false;
		this.hash = undefined;
		this.renderedHash = undefined;
		this.chunkReason = undefined;
		this.extraAsync = false;
		if(module) {
			this.origins.push({
				module,
				loc,
				name
			});
		}
	}

	get entry() {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	}

	set entry(data) {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	}

	get initial() {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	}

	set initial(data) {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	}

	/**
	 * @return {Array} - an array containing the chunks
	 */
	getChunks() {
		return this._chunks.getFromCache(getArray);
	}

	getNumberOfChunks() {
		return this._chunks.size;
	}

	get chunksIterable() {
		return this._chunks;
	}

	/**
	 * @return {Array} - an array containing the parents
	 */
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

	/**
	 * @return {Array} - an array containing the blocks
	 */
	getBlocks() {
		return this._blocks.getFromCache(getArray);
	}

	setBlocks(newBlocks) {
		this._blocks.clear();
		for(const p of newBlocks)
			this._blocks.add(p);
	}

	mapBlocks(fn) {
		return Array.from(this._blocks, fn);
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

	/**
	 * @return {Array} - an array containing the entrypoints
	 */
	getEntrypoints() {
		return this._entrypoints.getFromCache(getArray);
	}

	setEntrypoints(newEntrypoints) {
		this._entrypoints.clear();
		for(const p of newEntrypoints)
			this._entrypoints.add(p);
	}

	mapEntrypoints(fn) {
		return Array.from(this._entrypoints, fn);
	}

	getNumberOfEntrypoints() {
		return this._entrypoints.size;
	}

	hasEntrypoint(entrypoint) {
		return this._entrypoints.has(entrypoint);
	}

	get entrypointsIterable() {
		return this._entrypoints;
	}

	hasRuntime() {
		for(const entrypoint of this._entrypoints) {
			// We only need to check the first one
			return entrypoint.getRuntimeChunk() === this;
		}
		return false;
	}

	isInitial() {
		return this._entrypoints.size > 0;
	}

	hasEntryModule() {
		return !!this.entryModule;
	}

	addToCollection(collection, item) {
		if(item === this) {
			return false;
		}

		if(collection.indexOf(item) > -1) {
			return false;
		}

		collection.push(item);
		return true;
	}

	addChunk(chunk) {
		if(this._chunks.has(chunk)) {
			return false;
		}
		this._chunks.add(chunk);
		return true;
	}

	addParent(parentChunk) {
		if(!this._parents.has(parentChunk)) {
			this._parents.add(parentChunk);
			return true;
		}
		return false;
	}

	addModule(module) {
		if(!this._modules.has(module)) {
			this._modules.add(module);
			return true;
		}
		return false;
	}

	addBlock(block) {
		if(!this._blocks.has(block)) {
			this._blocks.add(block);
			return true;
		}
		return false;
	}

	addEntrypoint(entrypoint) {
		if(!this._entrypoints.has(entrypoint)) {
			this._entrypoints.add(entrypoint);
			return true;
		}
		return false;
	}

	removeModule(module) {
		if(this._modules.delete(module)) {
			module.removeChunk(this);
			return true;
		}
		return false;
	}

	removeChunk(chunk) {
		if(!this._chunks.has(chunk)) {
			return false;
		}

		this._chunks.delete(chunk);
		chunk.removeParent(this);
		return true;
	}

	removeParent(chunk) {
		if(this._parents.delete(chunk)) {
			chunk.removeChunk(this);
			return true;
		}
		return false;
	}

	addOrigin(module, loc) {
		this.origins.push({
			module,
			loc,
			name: this.name
		});
	}

	setModules(modules) {
		this._modules = new SortableSet(modules, sortByIdentifier);
	}

	getNumberOfModules() {
		return this._modules.size;
	}

	get modulesIterable() {
		return this._modules;
	}

	forEachModule(fn) {
		this._modules.forEach(fn);
	}

	mapModules(fn) {
		return Array.from(this._modules, fn);
	}

	compareTo(otherChunk) {
		this._modules.sort();
		otherChunk._modules.sort();
		if(this._modules.size > otherChunk._modules.size) return -1;
		if(this._modules.size < otherChunk._modules.size) return 1;
		const a = this._modules[Symbol.iterator]();
		const b = otherChunk._modules[Symbol.iterator]();
		while(true) { // eslint-disable-line
			const aItem = a.next();
			const bItem = b.next();
			if(aItem.done) return 0;
			const aModuleIdentifier = aItem.value.identifier();
			const bModuleIdentifier = bItem.value.identifier();
			if(aModuleIdentifier > bModuleIdentifier) return -1;
			if(aModuleIdentifier < bModuleIdentifier) return 1;
		}
	}

	containsModule(module) {
		return this._modules.has(module);
	}

	getModules() {
		return this._modules.getFromCache(getArray);
	}

	getModulesIdent() {
		return this._modules.getFromUnorderedCache(getModulesIdent);
	}

	remove(reason) {
		// cleanup modules
		// Array.from is used here to create a clone, because removeChunk modifies this._modules
		for(const module of Array.from(this._modules)) {
			module.removeChunk(this);
		}

		// cleanup parents
		for(const parentChunk of this._parents) {
			// remove this chunk from its parents
			parentChunk._chunks.delete(this);

			// cleanup "sub chunks"
			this._chunks.forEach(chunk => {
				/**
				 * remove this chunk as "intermediary" and connect
				 * it "sub chunks" and parents directly
				 */
				// add parent to each "sub chunk"
				chunk.addParent(parentChunk);
				// add "sub chunk" to parent
				parentChunk.addChunk(chunk);
			});
		}

		/**
		 * we need to iterate again over the chunks
		 * to remove this from the chunks parents.
		 * This can not be done in the above loop
		 * as it is not garuanteed that `this._parents` contains anything.
		 */
		for(const chunk of this._chunks) {
			// remove this as parent of every "sub chunk"
			chunk._parents.delete(this);
		}

		// cleanup blocks
		for(const block of this._blocks) {
			const idx = block.chunks.indexOf(this);
			if(idx >= 0) {
				block.chunks.splice(idx, 1);
				if(block.chunks.length === 0) {
					block.chunks = null;
					block.chunkReason = reason;
				}
			}
		}
	}

	moveModule(module, otherChunk) {
		module.removeChunk(this);
		module.addChunk(otherChunk);
		otherChunk.addModule(module);
		module.rewriteChunkInReasons(this, [otherChunk]);
	}

	replaceChunk(oldChunk, newChunk) {
		this._chunks.delete(oldChunk);
		if(this !== newChunk && newChunk.addParent(this)) {
			this.addChunk(newChunk);
		}
	}

	replaceParentChunk(oldParentChunk, newParentChunk) {
		this._parents.delete(oldParentChunk);
		if(this !== newParentChunk && newParentChunk.addChunk(this)) {
			this.addParent(newParentChunk);
		}
	}

	integrate(otherChunk, reason) {
		if(!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		// Array.from is used here to create a clone, because moveModule modifies otherChunk._modules
		for(const module of Array.from(otherChunk._modules)) {
			otherChunk.moveModule(module, this);
		}
		otherChunk._modules.clear();

		for(const parentChunk of otherChunk._parents) {
			parentChunk.replaceChunk(otherChunk, this);
		}
		otherChunk._parents.clear();

		for(const chunk of otherChunk._chunks) {
			chunk.replaceParentChunk(otherChunk, this);
		}
		otherChunk._chunks.clear();

		for(const b of otherChunk._blocks) {
			b.chunks = b.chunks ? b.chunks.map(c => {
				return c === otherChunk ? this : c;
			}) : [this];
			b.chunkReason = reason;
			this.addBlock(b);
		}
		otherChunk._blocks.clear();

		otherChunk.origins.forEach(origin => {
			this.origins.push(origin);
		});
		for(const b of this._blocks) {
			b.chunkReason = reason;
		}
		this.origins.forEach(origin => {
			if(!origin.reasons) {
				origin.reasons = [reason];
			} else if(origin.reasons[0] !== reason) {
				origin.reasons.unshift(reason);
			}
		});
		this._chunks.delete(otherChunk);
		this._chunks.delete(this);
		this._parents.delete(otherChunk);
		this._parents.delete(this);
		return true;
	}

	split(newChunk) {
		for(const block of this._blocks) {
			newChunk._blocks.add(block);
			block.chunks.push(newChunk);
		}
		for(const chunk of this._chunks) {
			newChunk.addChunk(chunk);
			chunk._parents.add(newChunk);
		}
		for(const parentChunk of this._parents) {
			parentChunk.addChunk(newChunk);
			newChunk._parents.add(parentChunk);
		}
		for(const entrypoint of this._entrypoints) {
			entrypoint.insertChunk(newChunk, this);
		}
	}

	isEmpty() {
		return this._modules.size === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		this._modules.forEach(m => hash.update(m.hash));
	}

	canBeIntegrated(otherChunk) {
		if(otherChunk.isInitial()) {
			return false;
		}
		if(this.isInitial()) {
			if(otherChunk.getNumberOfParents() !== 1 || otherChunk.getParents()[0] !== this) {
				return false;
			}
		}
		return true;
	}

	addMultiplierAndOverhead(size, options) {
		const overhead = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const multiplicator = this.isInitial() ? (options.entryChunkMultiplicator || 10) : 1;

		return size * multiplicator + overhead;
	}

	modulesSize() {
		return this._modules.getFromUnorderedCache(getModulesSize);
	}

	size(options) {
		return this.addMultiplierAndOverhead(this.modulesSize(), options);
	}

	integratedSize(otherChunk, options) {
		// Chunk if it's possible to integrate this chunk
		if(!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		let integratedModulesSize = this.modulesSize();
		// only count modules that do not exist in this chunk!
		for(const otherModule of otherChunk._modules) {
			if(!this._modules.has(otherModule)) {
				integratedModulesSize += otherModule.size();
			}
		}

		return this.addMultiplierAndOverhead(integratedModulesSize, options);
	}

	getChunkMaps(includeEntries, realHash) {
		const chunkHashMap = Object.create(null);
		const chunkNameMap = Object.create(null);

		const queue = [this];
		const chunksEnqueued = new Set([this]);

		while(queue.length > 0) {
			const chunk = queue.pop();
			if(!chunk.hasRuntime() || includeEntries) {
				chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
				if(chunk.name)
					chunkNameMap[chunk.id] = chunk.name;
			}
			for(const child of chunk.chunksIterable) {
				if(chunksEnqueued.has(child)) continue;
				chunksEnqueued.add(child);
				queue.push(child);
			}
		}

		return {
			hash: chunkHashMap,
			name: chunkNameMap
		};
	}

	getChunkModuleMaps(includeEntries, filterFn) {
		const chunkModuleIdMap = Object.create(null);
		const chunkModuleHashMap = Object.create(null);

		const chunksEnqueued = new Set([this]);
		const queue = [this];

		while(queue.length > 0) {
			const chunk = queue.pop();
			if(!chunk.hasRuntime() || includeEntries) {
				let array = undefined;
				for(const module of chunk.modulesIterable) {
					if(filterFn(module)) {
						if(array === undefined) {
							array = [];
							chunkModuleIdMap[chunk.id] = array;
						}
						array.push(module.id);
						chunkModuleHashMap[module.id] = module.renderedHash;
					}
				}
				if(array !== undefined) {
					array.sort();
				}
			}
			for(const child of chunk.chunksIterable) {
				if(chunksEnqueued.has(child)) continue;
				chunksEnqueued.add(child);
				queue.push(child);
			}
		}

		return {
			id: chunkModuleIdMap,
			hash: chunkModuleHashMap
		};
	}

	hasModuleInGraph(filterFn) {
		const chunksProcessed = new Set();
		const queue = [this];

		while(queue.length > 0) {
			const chunk = queue.pop();
			for(const module of chunk.modulesIterable)
				if(filterFn(module))
					return true;
			for(const next of chunk.chunksIterable) {
				if(!chunksProcessed.has(next)) {
					chunksProcessed.add(next);
					queue.push(next);
				}
			}
		}
		return false;
	}

	sortModules(sortByFn) {
		this._modules.sortWith(sortByFn || sortById);
	}

	sortItems(sortChunks) {
		this.sortModules();
		this.origins.sort((a, b) => {
			const aIdent = a.module.identifier();
			const bIdent = b.module.identifier();
			if(aIdent < bIdent) return -1;
			if(aIdent > bIdent) return 1;
			return compareLocations(a.loc, b.loc);
		});
		this.origins.forEach(origin => {
			if(origin.reasons)
				origin.reasons.sort();
		});
		if(sortChunks) {
			this._parents.sort();
			this._chunks.sort();
		}
	}

	toString() {
		return `Chunk[${Array.from(this._modules).join()}]`;
	}

	checkConstraints() {
		const chunk = this;
		for(const child of chunk._chunks) {
			if(!child._parents.has(chunk))
				throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
		}
		for(const parentChunk of chunk._parents) {
			if(!parentChunk._chunks.has(chunk))
				throw new Error(`checkConstraints: parent missing child ${parentChunk.debugId} <- ${chunk.debugId}`);
		}
	}
}

Object.defineProperty(Chunk.prototype, "modules", {
	configurable: false,
	get: util.deprecate(function() {
		return this._modules.getFromCache(getFrozenArray);
	}, "Chunk.modules is deprecated. Use Chunk.getNumberOfModules/mapModules/forEachModule/containsModule instead."),
	set: util.deprecate(function(value) {
		this.setModules(value);
	}, "Chunk.modules is deprecated. Use Chunk.addModule/removeModule instead.")
});

Object.defineProperty(Chunk.prototype, "chunks", {
	configurable: false,
	get: util.deprecate(function() {
		return this._chunks.getFromCache(getFrozenArray);
	}, "Chunk.chunks: Use Chunk.getChunks() instead"),
	set() {
		throw new Error("Readonly. Use Chunk.addChunk/removeChunk/getChunks to access/modify chunks.");
	}
});

Object.defineProperty(Chunk.prototype, "parents", {
	configurable: false,
	get: util.deprecate(function() {
		return this._parents.getFromCache(getFrozenArray);
	}, "Chunk.parents: Use Chunk.getParents() instead"),
	set: util.deprecate(function(value) {
		this.setParents(value);
	}, "Chunk.parents: Use Chunk.addParent/removeParent/setParents to modify parents.")
});

Object.defineProperty(Chunk.prototype, "blocks", {
	configurable: false,
	get: util.deprecate(function() {
		return this._blocks.getFromCache(getFrozenArray);
	}, "Chunk.blocks: Use Chunk.getBlocks() instead"),
	set: util.deprecate(function(value) {
		this.setBlocks(value);
	}, "Chunk.blocks: Use Chunk.addBlock/removeBlock/setBlocks to modify blocks.")
});

Object.defineProperty(Chunk.prototype, "entrypoints", {
	configurable: false,
	get: util.deprecate(function() {
		return this._entrypoints.getFromCache(getFrozenArray);
	}, "Chunk.entrypoints: Use Chunk.getEntrypoints() instead"),
	set: util.deprecate(function(value) {
		this.setBlocks(value);
	}, "Chunk.entrypoints: Use Chunk.addEntrypoint/setEntrypoints to modify entrypoints.")
});

module.exports = Chunk;
