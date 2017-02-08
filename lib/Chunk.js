/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const compareLocations = require("./compareLocations");
let debugId = 1000;
const removeAndDo = require("./removeAndDo");

const byId = (a, b) => {
	if(a.id < b.id) return -1;
	if(b.id < a.id) return 1;
	return 0;
};

const calculateSizeModules = (modules, start) => {
	var result = start || 0;
	for(var index = 0; index < modules.length; index++) {
		result += modules[index].size();
	}
	return result;
};

class Chunk {

	constructor(name, module, loc) {
		this.id = null;
		this.ids = null;
		this.debugId = debugId++;
		this.name = name;
		this.modules = [];
		this.entrypoints = [];
		this.chunks = [];
		this.parents = [];
		this.blocks = [];
		this.origins = [];
		this.files = [];
		this.rendered = false;
		this._removeAndDo = removeAndDo;
		this.addChunk = this.createAdder("chunks");
		this.addParent = this.createAdder("parents");
		if(module) {
			this.origins.push({
				module,
				loc,
				name
			});
		}
	}

	createAdder(collection) {
		const createAdderCallback = (chunk) => {
			if(chunk === this) {
				return false;
			}
			if(this[collection].indexOf(chunk) >= 0) {
				return false;
			}
			this[collection].push(chunk);
			return true;
		};
		return createAdderCallback;
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

	addModule(module) {
		if(this.modules.indexOf(module) >= 0) {
			return false;
		}
		this.modules.push(module);
		return true;
	}

	removeModule(module) {
		this._removeAndDo("modules", module, "removeChunk");
	}

	removeChunk(chunk) {
		this._removeAndDo("chunks", chunk, "removeParent");
	}

	removeParent(chunk) {
		this._removeAndDo("parents", chunk, "removeChunk");
	}

	addBlock(block) {
		if(this.blocks.indexOf(block) >= 0) {
			return false;
		}
		this.blocks.push(block);
		return true;
	}

	addOrigin(module, loc) {
		this.origins.push({
			module,
			loc,
			name: this.name
		});
	}

	remove(reason) {
		this.modules.slice().forEach(m => {
			m.removeChunk(this);
		}, this);
		this.parents.forEach(c => {
			const idx = c.chunks.indexOf(this);
			if(idx >= 0) {
				c.chunks.splice(idx, 1);
			}
			this.chunks.forEach(cc => {
				cc.addParent(c);
			});
		}, this);
		this.chunks.forEach(c => {
			const idx = c.parents.indexOf(this);
			if(idx >= 0) {
				c.parents.splice(idx, 1);
			}
			this.parents.forEach(cc => {
				cc.addChunk(c);
			});
		}, this);
		this.blocks.forEach(b => {
			const idx = b.chunks.indexOf(this);
			if(idx >= 0) {
				b.chunks.splice(idx, 1);
				if(b.chunks.length === 0) {
					b.chunks = null;
					b.chunkReason = reason;
				}
			}
		}, this);
	}

	moveModule(module, other) {
		module.removeChunk(this);
		module.addChunk(other);
		other.addModule(module);
		module.rewriteChunkInReasons(this, [other]);
	}

	integrate(other, reason) {
		if(!this.canBeIntegrated(other)) {
			return false;
		}

		var otherModules = other.modules.slice();
		for(var indexOtherModule = 0; indexOtherModule < otherModules.length; indexOtherModule++) {
			var m = otherModules[indexOtherModule];

			m.removeChunk(other);
			m.addChunk(this);
			this.addModule(m);
			m.rewriteChunkInReasons(other, [this]);
		}
		other.modules.length = 0;

		const moveChunks = (chunks, kind, onChunk) => {
			chunks.forEach(c => {
				const idx = c[kind].indexOf(other);
				if(idx >= 0) {
					c[kind].splice(idx, 1);
				}
				onChunk(c);
			});
		};
		moveChunks(other.parents, "chunks", c => {
			if(c !== this && this.addParent(c)) {
				c.addChunk(this);
			}
		});
		other.parents.length = 0;
		moveChunks(other.chunks, "parents", c => {
			if(c !== this && this.addChunk(c)) {
				c.addParent(this);
			}
		});
		other.chunks.length = 0;
		other.blocks.forEach(b => {
			b.chunks = (b.chunks || [this]).map(c => {
				return c === other ? this : c;
			}, this);
			b.chunkReason = reason;
			this.addBlock(b);
		}, this);
		other.blocks.length = 0;
		other.origins.forEach(origin => {
			this.origins.push(origin);
		}, this);
		this.origins.forEach(origin => {
			if(!origin.reasons) {
				origin.reasons = [reason];
			} else if(origin.reasons[0] !== reason) {
				origin.reasons.unshift(reason);
			}
		});
		this.chunks = this.chunks.filter(c => {
			return c !== other && c !== this;
		});
		this.parents = this.parents.filter(c => {
			return c !== other && c !== this;
		});
		return true;
	}

	split(newChunk) {
		const _this = this;
		this.blocks.forEach(b => {
			newChunk.blocks.push(b);
			b.chunks.push(newChunk);
		});
		this.chunks.forEach(c => {
			newChunk.chunks.push(c);
			c.parents.push(newChunk);
		});
		this.parents.forEach(p => {
			p.chunks.push(newChunk);
			newChunk.parents.push(p);
		});
		this.entrypoints.forEach(e => {
			e.insertChunk(newChunk, _this);
		});
	}

	isEmpty() {
		return this.modules.length === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		var modules = this.modules;
		for(var index = 0; index < modules.length; index++) {
			modules[index].updateHash(hash);
		}
	}

	size(options) {
		const CHUNK_OVERHEAD = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

		var modules = this.modules;
		var modulesSize = calculateSizeModules(modules, 0);

		return modulesSize * (this.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
	}

	canBeIntegrated(other) {
		if(other.isInitial()) {
			return false;
		}
		if(this.isInitial()) {
			if(other.parents.length !== 1 || other.parents[0] !== this) {
				return false;
			}
		}
		return true;
	}

	integratedSize(other, options) {
		// Chunk if it's possible to integrate this chunk
		if(!this.canBeIntegrated(other)) {
			return false;
		}

		const CHUNK_OVERHEAD = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;
		var modules = this.modules;
		var otherModules = other.modules;
		var mergedModules = [];

		for(var index = 0; index < otherModules.length; index++) {
			var m = otherModules[index];

			if(modules.indexOf(m) < 0) {
				mergedModules.push(m);
			}
		}

		// Calculate size this.modules
		var modulesSize = calculateSizeModules(modules, 0);
		// Calculate size othe.modules
		modulesSize = calculateSizeModules(mergedModules, modulesSize);

		return modulesSize * (this.isInitial() || other.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
	}

	getChunkMaps(includeEntries, realHash) {
		const chunksProcessed = [];
		const chunkHashMap = Object.create(null);
		const chunkNameMap = Object.create(null);
		(function addChunk(c) {
			if(chunksProcessed.indexOf(c) >= 0) return;
			chunksProcessed.push(c);
			if(!c.hasRuntime() || includeEntries) {
				chunkHashMap[c.id] = realHash ? c.hash : c.renderedHash;
				if(c.name)
					chunkNameMap[c.id] = c.name;
			}
			var chunks = c.chunks;
			for(var index = 0; index < chunks.length; index++) {
				addChunk(chunks[index]);
			}
		}(this));
		return {
			hash: chunkHashMap,
			name: chunkNameMap
		};
	}

	sortItems() {
		this.modules.sort(byId);
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
		this.parents.sort(byId);
		this.chunks.sort(byId);
	}

	toString() {
		return `Chunk[${this.modules.join()}]`;
	}

	checkConstraints() {
		const chunk = this;

		var chunks = chunk.chunks;
		for(var indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
			var child = chunks[indexChunk];

			if(chunks.indexOf(child) !== indexChunk)
				throw new Error(`checkConstraints: duplicate child in chunk ${chunk.debugId} ${child.debugId}`);
			if(child.parents.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
		}

		var parents = chunk.parents;
		for(var indexParent = 0; indexParent < parents.length; indexParent++) {
			var parent = parents[indexParent];

			if(parents.indexOf(parent) !== indexParent)
				throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parent.debugId}`);
			if(parent.chunks.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: parent missing child ${parent.debugId} <- ${chunk.debugId}`);
		}
	}
}

module.exports = Chunk;
