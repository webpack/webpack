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

const EMPTY_RESOLVE_OPTIONS = {};

let debugId = 1000;

const sortById = (a, b) => {
	return a.id - b.id;
};

const sortByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

const getFrozenArray = set => Object.freeze(Array.from(set));

const getDebugIdent = set => {
	set.sortWith(sortByDebugId);
	const chunks = set;
	const list = [];
	for(const chunk of chunks) {
		const debugId = chunk.debugId;

		if(typeof debugId !== "number") {
			return null;
		}

		list.push(debugId);
	}

	return list.join(",");
};

class Module extends DependenciesBlock {

	constructor(type) {
		super();
		this.type = type;

		// Unique Id
		this.debugId = debugId++;

		// Hash
		this.hash = undefined;
		this.renderedHash = undefined;

		// Info from Factory
		// TODO refactor: pass as constructor argument
		this.context = null;
		this.resolveOptions = EMPTY_RESOLVE_OPTIONS;
		this.factoryMeta = {};

		// Info from Build
		this.warnings = [];
		this.errors = [];
		this.buildMeta = undefined;
		this.buildInfo = undefined;

		// Graph (per Compilation)
		this.reasons = [];
		this._chunks = new SortableSet(undefined, sortById);

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
		this.optimizationBailout = [];

		// delayed operations
		this._rewriteChunkInReasons = undefined;
	}

	get exportsArgument() {
		return this.buildInfo && this.buildInfo.exportsArgument || "exports";
	}

	get moduleArgument() {
		return this.buildInfo && this.buildInfo.moduleArgument || "module";
	}

	disconnect() {
		this.hash = undefined;
		this.renderedHash = undefined;

		this.reasons.length = 0;
		this._rewriteChunkInReasons = undefined;
		this._chunks.clear();

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
		this.optimizationBailout.length = 0;
		super.disconnect();
	}

	unseal() {
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.depth = null;
		this._chunks.clear();
		super.unseal();
	}

	setChunks(chunks) {
		this._chunks = new SortableSet(chunks, sortById);
	}

	addChunk(chunk) {
		this._chunks.add(chunk);
	}

	removeChunk(chunk) {
		if(this._chunks.delete(chunk)) {
			chunk.removeModule(this);
			return true;
		}
		return false;
	}

	isInChunk(chunk) {
		return this._chunks.has(chunk);
	}

	getChunkIdsIdent() {
		return this._chunks.getFromUnorderedCache(getDebugIdent);
	}

	get optional() {
		return this.reasons.length > 0 && this.reasons.every(r => r.dependency && r.dependency.optional);
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

	addReason(module, dependency, explanation) {
		this.reasons.push(new ModuleReason(module, dependency, explanation));
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
		if(this._rewriteChunkInReasons) {
			for(const operation of this._rewriteChunkInReasons)
				this._doRewriteChunkInReasons(operation.oldChunk, operation.newChunks);
			this._rewriteChunkInReasons = undefined;
		}
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
		// This is expensive. Delay operation until we really need the data
		if(this._rewriteChunkInReasons === undefined)
			this._rewriteChunkInReasons = [];
		this._rewriteChunkInReasons.push({
			oldChunk,
			newChunks
		});
	}

	_doRewriteChunkInReasons(oldChunk, newChunks) {
		for(let i = 0; i < this.reasons.length; i++) {
			this.reasons[i].rewriteChunks(oldChunk, newChunks);
		}
	}

	isUsed(exportName) {
		if(!exportName) return this.used !== false;
		if(this.used === null || this.usedExports === null) return exportName;
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
		if(!Array.isArray(this.buildMeta.providedExports))
			return null;
		return this.buildMeta.providedExports.indexOf(exportName) >= 0;
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
		this.dependencies.length = 0;
		this.blocks.length = 0;
		this.variables.length = 0;
		this.buildMeta = undefined;
		this.buildInfo = undefined;
		this.disconnect();
	}

	get arguments() {
		throw new Error("Module.arguments was removed, there is no replacement.");
	}

	set arguments(value) {
		throw new Error("Module.arguments was removed, there is no replacement.");
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
		return this._chunks.getFromCache(getFrozenArray);
	}, "Module.chunks: Use Module.forEachChunk/mapChunks/getNumberOfChunks/isInChunk/addChunk/removeChunk instead"),
	set() {
		throw new Error("Readonly. Use Module.addChunk/removeChunk to modify chunks.");
	}
});

Object.defineProperty(Module.prototype, "meta", {
	configurable: false,
	get: util.deprecate(function() {
		return this.buildMeta;
	}, "Module.meta was renamed to Module.buildMeta"),
	set: util.deprecate(function(value) {
		this.buildMeta = value;
	}, "Module.meta was renamed to Module.buildMeta"),
});

Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
Module.prototype.nameForCondition = null;

module.exports = Module;
