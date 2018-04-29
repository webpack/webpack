/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ChunkGroup = require("./ChunkGroup");

class Entrypoint extends ChunkGroup {
	constructor(name) {
		super(name);
		this.runtimeChunk = undefined;
	}

	isInitial() {
		return true;
	}

	setRuntimeChunk(chunk) {
		this.runtimeChunk = chunk;
	}

	getRuntimeChunk() {
		return this.runtimeChunk || this.chunks[0];
	}
}

module.exports = Entrypoint;
