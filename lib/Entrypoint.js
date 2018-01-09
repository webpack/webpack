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

	unshiftChunk(chunk) {
		const oldIdx = this.chunks.indexOf(chunk);
		if(oldIdx > 0) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.unshift(chunk);
		} else if(oldIdx < 0 && chunk.addEntrypoint(this)) {
			this.chunks.unshift(chunk);
		}
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
			chunk.addEntrypoint(this);
		}
	}

	remove() {
		for(const chunk of this.chunks) {
			chunk.removeEntrypoint(this);
		}
		this.chunks.length = 0;
	}

	getFiles() {
		const files = new Set();

		for(let chunkIdx = 0; chunkIdx < this.chunks.length; chunkIdx++) {
			for(let fileIdx = 0; fileIdx < this.chunks[chunkIdx].files.length; fileIdx++) {
				files.add(this.chunks[chunkIdx].files[fileIdx]);
			}
		}

		return Array.from(files);
	}

	getRuntimeChunk() {
		return this.chunks[this.chunks.length - 1];
	}
}

module.exports = Entrypoint;
