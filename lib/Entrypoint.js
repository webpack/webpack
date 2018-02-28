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

	getFiles() {
		const files = new Set();

		for (const chunk of this.chunks) {
			for (const file of chunk.files) {
				files.add(file);
			}
		}

		return Array.from(files);
	}

	setRuntimeChunk(chunk) {
		this.runtimeChunk = chunk;
	}

	getRuntimeChunk() {
		return this.runtimeChunk || this.chunks[0];
	}
}

module.exports = Entrypoint;
