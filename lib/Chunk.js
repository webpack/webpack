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

class Chunk {

	constructor(name, module, loc) {
		this.id = null;
		this.ids = null;
		this.debugId = debugId++;
		this.name = name;
		this._modules = new SortableSet(undefined, sortByIdentifier);
		this.entrypoints = [];
		this.chunks = [];
		this.parents = [];
		this.blocks = [];
		this.origins = [];
		this.files = [];
		this.rendered = false;
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

	hasRuntime() {
		if(this.entrypoints.length === 0) return false;
		return this.entrypoints[0].chunks[0] === this;
	}

	isInitial() {
		return this.entrypoints.length > 0;
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
		return this.addToCollection(this.chunks, chunk);
	}

	addParent(parentChunk) {
		return this.addToCollection(this.parents, parentChunk);
	}

	addModule(module) {
		if(!this._modules.has(module)) {
			this._modules.add(module);
			return true;
		}
		return false;
	}

	addBlock(block) {
		return this.addToCollection(this.blocks, block);
	}

	removeModule(module) {
		if(this._modules.delete(module)) {
			module.removeChunk(this);
			return true;
		}
		return false;
	}

	removeChunk(chunk) {
		const idx = this.chunks.indexOf(chunk);
		if(idx >= 0) {
			this.chunks.splice(idx, 1);
			chunk.removeParent(this);
			return true;
		}
		return false;
	}

	removeParent(chunk) {
		const idx = this.parents.indexOf(chunk);
		if(idx >= 0) {
			this.parents.splice(idx, 1);
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
		return Array.from(this._modules);
	}

	getModulesIdent() {
		this._modules.sort();
		let str = "";
		this._modules.forEach(m => {
			str += m.identifier() + "#";
		});
		return str;
	}

	remove(reason) {
		// cleanup modules
		// Array.from is used here to create a clone, because removeChunk modifies this._modules
		Array.from(this._modules).forEach(module => {
			module.removeChunk(this);
		});

		// cleanup parents
		this.parents.forEach(parentChunk => {
			// remove this chunk from its parents
			const idx = parentChunk.chunks.indexOf(this);
			if(idx >= 0) {
				parentChunk.chunks.splice(idx, 1);
			}

			// cleanup "sub chunks"
			this.chunks.forEach(chunk => {
				/**
				 * remove this chunk as "intermediary" and connect
				 * it "sub chunks" and parents directly
				 */
				// add parent to each "sub chunk"
				chunk.addParent(parentChunk);
				// add "sub chunk" to parent
				parentChunk.addChunk(chunk);
			});
		});

		/**
		 * we need to iterate again over the chunks
		 * to remove this from the chunks parents.
		 * This can not be done in the above loop
		 * as it is not garuanteed that `this.parents` contains anything.
		 */
		this.chunks.forEach(chunk => {
			// remove this as parent of every "sub chunk"
			const idx = chunk.parents.indexOf(this);
			if(idx >= 0) {
				chunk.parents.splice(idx, 1);
			}
		});

		// cleanup blocks
		this.blocks.forEach(block => {
			const idx = block.chunks.indexOf(this);
			if(idx >= 0) {
				block.chunks.splice(idx, 1);
				if(block.chunks.length === 0) {
					block.chunks = null;
					block.chunkReason = reason;
				}
			}
		});
	}

	moveModule(module, otherChunk) {
		module.removeChunk(this);
		module.addChunk(otherChunk);
		otherChunk.addModule(module);
		module.rewriteChunkInReasons(this, [otherChunk]);
	}

	replaceChunk(oldChunk, newChunk) {
		const idx = this.chunks.indexOf(oldChunk);
		if(idx >= 0) {
			this.chunks.splice(idx, 1);
		}
		if(this !== newChunk && newChunk.addParent(this)) {
			this.addChunk(newChunk);
		}
	}

	replaceParentChunk(oldParentChunk, newParentChunk) {
		const idx = this.parents.indexOf(oldParentChunk);
		if(idx >= 0) {
			this.parents.splice(idx, 1);
		}
		if(this !== newParentChunk && newParentChunk.addChunk(this)) {
			this.addParent(newParentChunk);
		}
	}

	integrate(otherChunk, reason) {
		if(!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		// Array.from is used here to create a clone, because moveModule modifies otherChunk._modules
		const otherChunkModules = Array.from(otherChunk._modules);
		otherChunkModules.forEach(module => otherChunk.moveModule(module, this));
		otherChunk._modules.clear();

		otherChunk.parents.forEach(parentChunk => parentChunk.replaceChunk(otherChunk, this));
		otherChunk.parents.length = 0;

		otherChunk.chunks.forEach(chunk => chunk.replaceParentChunk(otherChunk, this));
		otherChunk.chunks.length = 0;

		otherChunk.blocks.forEach(b => {
			b.chunks = b.chunks ? b.chunks.map(c => {
				return c === otherChunk ? this : c;
			}) : [this];
			b.chunkReason = reason;
			this.addBlock(b);
		});
		otherChunk.blocks.length = 0;

		otherChunk.origins.forEach(origin => {
			this.origins.push(origin);
		});
		this.origins.forEach(origin => {
			if(!origin.reasons) {
				origin.reasons = [reason];
			} else if(origin.reasons[0] !== reason) {
				origin.reasons.unshift(reason);
			}
		});
		this.chunks = this.chunks.filter(chunk => {
			return chunk !== otherChunk && chunk !== this;
		});
		this.parents = this.parents.filter(parentChunk => {
			return parentChunk !== otherChunk && parentChunk !== this;
		});
		return true;
	}

	split(newChunk) {
		this.blocks.forEach(block => {
			newChunk.blocks.push(block);
			block.chunks.push(newChunk);
		});
		this.chunks.forEach(chunk => {
			newChunk.chunks.push(chunk);
			chunk.parents.push(newChunk);
		});
		this.parents.forEach(parentChunk => {
			parentChunk.chunks.push(newChunk);
			newChunk.parents.push(parentChunk);
		});
		this.entrypoints.forEach(entrypoint => {
			entrypoint.insertChunk(newChunk, this);
		});
	}

	isEmpty() {
		return this._modules.size === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		this._modules.forEach(m => m.updateHash(hash));
	}

	canBeIntegrated(otherChunk) {
		if(otherChunk.isInitial()) {
			return false;
		}
		if(this.isInitial()) {
			if(otherChunk.parents.length !== 1 || otherChunk.parents[0] !== this) {
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
		let count = 0;
		for(const module of this._modules) {
			count += module.size();
		}
		return count;
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
		const chunksProcessed = [];
		const chunkHashMap = {};
		const chunkNameMap = {};
		(function addChunk(chunk) {
			if(chunksProcessed.indexOf(chunk) >= 0) return;
			chunksProcessed.push(chunk);
			if(!chunk.hasRuntime() || includeEntries) {
				chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
				if(chunk.name)
					chunkNameMap[chunk.id] = chunk.name;
			}
			chunk.chunks.forEach(addChunk);
		}(this));
		return {
			hash: chunkHashMap,
			name: chunkNameMap
		};
	}

	sortModules(sortByFn) {
		this._modules.sortWith(sortByFn || sortById);
	}

	sortItems() {
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
		this.parents.sort(sortById);
		this.chunks.sort(sortById);
	}

	toString() {
		return `Chunk[${Array.from(this._modules).join()}]`;
	}

	checkConstraints() {
		const chunk = this;
		chunk.chunks.forEach((child, idx) => {
			if(chunk.chunks.indexOf(child) !== idx)
				throw new Error(`checkConstraints: duplicate child in chunk ${chunk.debugId} ${child.debugId}`);
			if(child.parents.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
		});
		chunk.parents.forEach((parentChunk, idx) => {
			if(chunk.parents.indexOf(parentChunk) !== idx)
				throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parentChunk.debugId}`);
			if(parentChunk.chunks.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: parent missing child ${parentChunk.debugId} <- ${chunk.debugId}`);
		});
	}
}

Object.defineProperty(Chunk.prototype, "modules", {
	configurable: false,
	get: util.deprecate(function() {
		return Array.from(this._modules);
	}, "Chunk.modules is deprecated. Use Chunk.getNumberOfModules/mapModules/forEachModule/containsModule instead."),
	set: util.deprecate(function(value) {
		this.setModules(value);
	}, "Chunk.modules is deprecated. Use Chunk.addModule/removeModule instead.")
});

module.exports = Chunk;
