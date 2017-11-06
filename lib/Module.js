/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

const DependenciesBlock = require("./DependenciesBlock");
const ModuleReason = require("./ModuleReason");
const SortableSet = require("./util/SortableSet");
const Template = require("./Template");

let debugId = 1000;

const sortById = (a, b) => {
	return a.id - b.id;
};

const sortByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

class Module extends DependenciesBlock {

	constructor() {
		super();

		// Unique Id
		this.debugId = debugId++;

		// Info from Factory
		// TODO refactor: pass as constructor argument
		this.context = null;

		// Info from Build
		this.sideEffectFree = false;
		this.warnings = [];
		this.errors = [];
		this.strict = false;
		this.meta = {};
		this.exportsArgument = undefined;
		this.moduleArgument = undefined;
		this.assets = null;
		this.fileDependencies = undefined;
		this.contextDependencies = undefined;

		// Graph (per Compilation)
		this.reasons = [];
		this._chunks = new SortableSet(undefined, sortById);

		// Caching
		this._chunksDebugIdent = undefined;

		// Info from Compilation (per Compilation)
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this.issuer = null;
		this.profile = undefined;
		this.prefetched = false;
		this.built = false;

		// Info from Optimization (per Compilation)
		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this.optimizationBailout = [];
	}

	disconnect() {
		this.reasons.length = 0;
		this._chunks.clear();

		this._chunksDebugIdent = undefined;

		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this.issuer = null;
		this.profile = undefined;
		this.prefetched = false;
		this.built = false;

		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this.optimizationBailout.length = 0;
		super.disconnect();
	}

	unseal() {
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this._chunks.clear();
		this._chunksDebugIdent = undefined;
		super.unseal();
	}

	setChunks(chunks) {
		this._chunks = new SortableSet(chunks, sortById);
		this._chunksDebugIdent = undefined;
	}

	addChunk(chunk) {
		this._chunks.add(chunk);
		this._chunksDebugIdent = undefined;
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
		this._chunks.sortWith(sortByDebugId);
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

	get optional() {
		return this.reasons.length > 0 && this.reasons.every(r => r.dependency.optional);
	}

	forEachChunk(fn) {
		this._chunks.forEach(fn);
	}

	mapChunks(fn) {
		return Array.from(this._chunks, fn);
	}

	getChunks() {
		return Array.from(this._chunks);
	}

	getNumberOfChunks() {
		return this._chunks.size;
	}

	get chunksIterable() {
		return this._chunks;
	}

	hasEqualsChunks(otherModule) {
		if(this._chunks.size !== otherModule._chunks.size) return false;
		this._chunks.sortWith(sortByDebugId);
		otherModule._chunks.sortWith(sortByDebugId);
		const a = this._chunks[Symbol.iterator]();
		const b = otherModule._chunks[Symbol.iterator]();
		while(true) { // eslint-disable-line
			const aItem = a.next();
			const bItem = b.next();
			if(aItem.done) return true;
			if(aItem.value !== bItem.value) return false;
		}
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
		for(let i = 0; i < this.reasons.length; i++) {
			if(this.reasons[i].hasChunk(chunk))
				return true;
		}
		return false;
	}

	hasReasons() {
		return this.reasons.length > 0;
	}

	rewriteChunkInReasons(oldChunk, newChunks) {
		for(let i = 0; i < this.reasons.length; i++) {
			this.reasons[i].rewriteChunks(oldChunk, newChunks);
		}
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
			this._chunks.sort();
		this.reasons.sort((a, b) => {
			if(a.module === b.module) return 0;
			if(!a.module) return -1;
			if(!b.module) return 1;
			return sortById(a.module, b.module);
		});
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
		return this._chunks.getFrozenArray();
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
