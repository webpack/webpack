/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");
const DependenciesBlock = require("./DependenciesBlock");
const ModuleReason = require("./ModuleReason");
const Template = require("./Template");

function addToSet(set, items) {
	for(const item of items) {
		if(set.indexOf(item) < 0)
			set.push(item);
	}
}

function byId(a, b) {
	return a.id - b.id;
}

function byDebugId(a, b) {
	return a.debugId - b.debugId;
}

let debugId = 1000;

class Module extends DependenciesBlock {
	constructor() {
		super();
		this.context = null;
		this.reasons = [];
		this.debugId = debugId++;
		this.lastId = -1;
		this.id = null;
		this.portableId = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this._chunks = new Set();
		this._chunksIsSorted = true;
		this._chunksIsSortedByDebugId = true;
		this._chunksDebugIdent = undefined;
		this.warnings = [];
		this.dependenciesWarnings = [];
		this.errors = [];
		this.dependenciesErrors = [];
		this.strict = false;
		this.meta = {};
		this.optimizationBailout = [];
	}

	disconnect() {
		this.reasons.length = 0;
		this.lastId = this.id;
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this._chunks.clear();
		this._chunksDebugIdent = undefined;
		this._chunksIsSorted = this._chunksIsSortedByDebugId = false;
		super.disconnect();
	}

	unseal() {
		this.lastId = this.id;
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this._chunks.clear();
		this._chunksDebugIdent = undefined;
		this._chunksIsSorted = this._chunksIsSortedByDebugId = false;
		super.unseal();
	}

	addChunk(chunk) {
		this._chunks.add(chunk);
		this._chunksDebugIdent = undefined;
		this._chunksIsSorted = this._chunksIsSortedByDebugId = false;
	}

	removeChunk(chunk) {
		if(this._chunks.delete(chunk)) {
			this._chunksDebugIdent = undefined;
			chunk.removeModule(this);
			return true;
		}
		return false;
	}

	isInChunk(chunk) {
		return this._chunks.has(chunk);
	}

	getChunkIdsIdent() {
		if(this._chunksDebugIdent !== undefined) return this._chunksDebugIdent;
		this._ensureChunksSortedByDebugId();
		const chunks = this._chunks;
		const list = [];
		for(const chunk of chunks) {
			const debugId = chunk.debugId;

			if(typeof debugId !== "number") {
				return this._chunksDebugIdent = null;
			}

			list.push(debugId);
		}

		return this._chunksDebugIdent = list.join(",");
	}

	forEachChunk(fn) {
		this._chunks.forEach(fn);
	}

	mapChunks(fn) {
		return Array.from(this._chunks, fn);
	}

	getNumberOfChunks() {
		return this._chunks.size;
	}

	_ensureChunksSorted() {
		if(this._chunksIsSorted) return;
		this._chunks = new Set(Array.from(this._chunks).sort(byId));
		this._chunksIsSortedByDebugId = false;
		this._chunksIsSorted = true;
	}

	_ensureChunksSortedByDebugId() {
		if(this._chunksIsSortedByDebugId) return;
		this._chunks = new Set(Array.from(this._chunks).sort(byDebugId));
		this._chunksIsSorted = false;
		this._chunksIsSortedByDebugId = true;
	}

	addReason(module, dependency) {
		this.reasons.push(new ModuleReason(module, dependency));
	}

	removeReason(module, dependency) {
		for(let i = 0; i < this.reasons.length; i++) {
			let r = this.reasons[i];
			if(r.module === module && r.dependency === dependency) {
				this.reasons.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	hasReasonForChunk(chunk) {
		for(const r of this.reasons) {
			if(r.chunks) {
				if(r.chunks.indexOf(chunk) >= 0)
					return true;
			} else if(r.module._chunks.has(chunk))
				return true;
		}
		return false;
	}

	rewriteChunkInReasons(oldChunk, newChunks) {
		this.reasons.forEach(r => {
			if(!r.chunks) {
				if(!r.module._chunks.has(oldChunk))
					return;
				r.chunks = Array.from(r.module._chunks);
			}
			r.chunks = r.chunks.reduce((arr, c) => {
				addToSet(arr, c !== oldChunk ? [c] : newChunks);
				return arr;
			}, []);
		});
	}

	isUsed(exportName) {
		if(this.used === null) return exportName;
		if(!exportName) return !!this.used;
		if(!this.used) return false;
		if(!this.usedExports) return false;
		if(this.usedExports === true) return exportName;
		let idx = this.usedExports.indexOf(exportName);
		if(idx < 0) return false;
		if(this.isProvided(exportName))
			return Template.numberToIdentifer(idx);
		return exportName;
	}

	isProvided(exportName) {
		if(!Array.isArray(this.providedExports))
			return null;
		return this.providedExports.indexOf(exportName) >= 0;
	}

	toString() {
		return `Module[${this.id || this.debugId}]`;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		return true;
	}

	updateHash(hash) {
		hash.update(this.id + "" + this.used);
		hash.update(JSON.stringify(this.usedExports));
		super.updateHash(hash);
	}

	sortItems(sortChunks) {
		super.sortItems();
		if(sortChunks)
			this._ensureChunksSorted();
		this.reasons.sort((a, b) => byId(a.module, b.module));
		if(Array.isArray(this.usedExports)) {
			this.usedExports.sort();
		}
	}

	unbuild() {
		this.disconnect();
	}
}

Object.defineProperty(Module.prototype, "entry", {
	configurable: false,
	get() {
		throw new Error("Module.entry was removed. Use Chunk.entryModule");
	},
	set() {
		throw new Error("Module.entry was removed. Use Chunk.entryModule");
	}
});

Object.defineProperty(Module.prototype, "chunks", {
	configurable: false,
	get: util.deprecate(function() {
		return Array.from(this._chunks);
	}, "Module.chunks: Use Module.forEachChunk/mapChunks/getNumberOfChunks/isInChunk/addChunk/removeChunk instead"),
	set() {
		throw new Error("Readonly. Use Module.addChunk/removeChunk to modify chunks.");
	}
});

Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
Module.prototype.nameForCondition = null;

module.exports = Module;
