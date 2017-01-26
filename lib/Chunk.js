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

	addParent(parent) {
		return this.addToCollection(this.parents, parent);
	}

	addModule(module) {
		return this.addToCollection(this.modules, module);
	}

	addBlock(block) {
		return this.addToCollection(this.blocks, block);
	}

	removeModule(module) {
		removeAndDo(this.modules, module, "removeChunk", this);
	}

	removeChunk(chunk) {
		removeAndDo(this.chunks, chunk, "removeParent", this);
	}

	removeParent(chunk) {
		removeAndDo(this.parents, chunk, "removeChunk", this);
	}

	addOrigin(module, loc) {
		this.origins.push({
			module,
			loc,
			name: this.name
		});
	}

	remove(reason) {
		// cleanup modules
		this.modules.slice().forEach(module => {
			module.removeChunk(this);
		});

		// cleanup parents
		this.parents.forEach(parent => {
			// remove this chunk from its parents
			const idx = parent.chunks.indexOf(this);
			if(idx >= 0) {
				parent.chunks.splice(idx, 1);
			}

			// cleanup "sub chunks"
			this.chunks.forEach(chunk => {
				/**
				 * remove this chunk as "intermediary" and connect
				 * it "sub chunks" and parents directly
				 */
				// add parent to each "sub chunk"
				chunk.addParent(parent);
				// add "sub chunk" to parent
				parent.addChunk(chunk);

				// remove this as parent of every "sub chunk"
				const idx = chunk.parents.indexOf(this);
				if(idx >= 0) {
					chunk.parents.splice(idx, 1);
				}
			});
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

	replaceParent(oldParent, newParent) {
		const idx = this.parents.indexOf(oldParent);
		if(idx >= 0) {
			this.parents.splice(idx, 1);
		}
		if(this !== newParent && newParent.addChunk(this)) {
			this.addParent(newParent);
		}
	}

	integrate(other, reason) {
		if(!this.canBeIntegrated(other)) {
			return false;
		}

		const otherModules = other.modules.slice();
		otherModules.forEach(m => other.moveModule(m, this));
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
			e.insertChunk(newChunk, this);
		});
	}

	isEmpty() {
		return this.modules.length === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		this.modules.forEach(m => m.updateHash(hash));
	}

	size(options) {
		const CHUNK_OVERHEAD = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

		const modulesSize = this.modules.reduce((a, b) => {
			return a + b.size();
		}, 0);
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

		const mergedModules = this.modules.slice();
		other.modules.forEach(m => {
			if(this.modules.indexOf(m) < 0) {
				mergedModules.push(m);
			}
		}, this);

		const modulesSize = mergedModules.reduce((a, m) => {
			return a + m.size();
		}, 0);
		return modulesSize * (this.isInitial() || other.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
	}

	getChunkMaps(includeEntries, realHash) {
		const chunksProcessed = [];
		const chunkHashMap = {};
		const chunkNameMap = {};
		(function addChunk(c) {
			if(chunksProcessed.indexOf(c) >= 0) return;
			chunksProcessed.push(c);
			if(!c.hasRuntime() || includeEntries) {
				chunkHashMap[c.id] = realHash ? c.hash : c.renderedHash;
				if(c.name)
					chunkNameMap[c.id] = c.name;
			}
			c.chunks.forEach(addChunk);
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
		chunk.chunks.forEach((child, idx) => {
			if(chunk.chunks.indexOf(child) !== idx)
				throw new Error(`checkConstraints: duplicate child in chunk ${chunk.debugId} ${child.debugId}`);
			if(child.parents.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
		});
		chunk.parents.forEach((parent, idx) => {
			if(chunk.parents.indexOf(parent) !== idx)
				throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parent.debugId}`);
			if(parent.chunks.indexOf(chunk) < 0)
				throw new Error(`checkConstraints: parent missing child ${parent.debugId} <- ${chunk.debugId}`);
		});
	}
}

module.exports = Chunk;
