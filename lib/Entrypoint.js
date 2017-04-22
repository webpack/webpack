/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class Entrypoint {
	constructor(name) {
		this.name = name;
		this.chunks = [];
	}

	removeChunk(chunk) {
		var idx = this.chunks.indexOf(chunk);
		if(idx >= 0) this.chunks.splice(idx, 1);
		idx = chunk.entrypoints.indexOf(this);
		if(idx >= 0) chunk.entrypoints.splice(idx, 1);
	}

	unshiftChunk(chunk) {
		this.chunks.unshift(chunk);
		chunk.entrypoints.push(this);
	}

	insertChunk(chunk, before) {
		const oldIdx = this.chunks.indexOf(chunk);
		const idx = this.chunks.indexOf(before);
		if(idx < 0) {
			throw new Error("before chunk not found");
		}
		if(oldIdx >= 0 && oldIdx > idx) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.splice(idx, 0, chunk);
		} else if(oldIdx < 0) {
			this.chunks.splice(idx, 0, chunk);
			chunk.entrypoints.push(this);
		}
	}

	appendChunk(chunk) {
		const idx = this.chunks.indexOf(chunk);
		if(idx < 0) {
			this.chunks.push(chunk);
			chunk.entrypoints.push(this);
		}
	}

	getFiles() {
		const files = [];

		for(let chunkIdx = 0; chunkIdx < this.chunks.length; chunkIdx++) {
			for(let fileIdx = 0; fileIdx < this.chunks[chunkIdx].files.length; fileIdx++) {
				if(files.indexOf(this.chunks[chunkIdx].files[fileIdx]) === -1) {
					files.push(this.chunks[chunkIdx].files[fileIdx]);
				}
			}
		}

		return files;
	}

	getRuntimeChunk() {
		return this.chunks[0];
	}
}

module.exports = Entrypoint;
