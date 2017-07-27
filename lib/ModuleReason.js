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
	}

	hasChunk(chunk) {
		return this.dependency.module.isInChunk(chunk);
	}
}

Object.defineProperty(ModuleReason.prototype, "chunks", {
	configurable: false,
	get: util.deprecate(function() {
		return this.dependency.module.getChunks();
	}, "ModuleReason.chunks: Use ModuleReason.hasChunk/rewriteChunks instead"),
	set() {
		throw new Error("Readonly. Use ModuleReason.rewriteChunks to modify chunks.");
	}
});

module.exports = ModuleReason;
