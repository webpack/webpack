/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

class ModuleReason {
	constructor(module, dependency) {
		this.module = module;
		this.dependency = dependency;
		this._chunks = null;
	}

	hasChunk(chunk) {
		if(this._chunks) {
			if(this._chunks.has(chunk))
				return true;
		} else if(this.module._chunks.has(chunk))
			return true;
		return false;
	}

	rewriteChunks(oldChunk, newChunks) {
		if(!this._chunks) {
			if(!this.module._chunks.has(oldChunk))
				return;
			this._chunks = new Set(this.module._chunks);
		}
		if(this._chunks.has(oldChunk)) {
			this._chunks.delete(oldChunk);
			for(let i = 0; i < newChunks.length; i++) {
				this._chunks.add(newChunks[i]);
			}
		}
	}
}

Object.defineProperty(ModuleReason.prototype, "chunks", {
	configurable: false,
	get: util.deprecate(function() {
		return this._chunks ? Array.from(this._chunks) : null;
	}, "ModuleReason.chunks: Use ModuleReason.hasChunk/rewriteChunks instead"),
	set() {
		throw new Error("Readonly. Use ModuleReason.rewriteChunks to modify chunks.");
	}
});

module.exports = ModuleReason;
