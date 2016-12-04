/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Entrypoint(name) {
	this.name = name;
	this.chunks = [];
}
module.exports = Entrypoint;

Entrypoint.prototype.unshiftChunk = function(chunk) {
	this.chunks.unshift(chunk);
	chunk.entrypoints.push(this);
};

Entrypoint.prototype.insertChunk = function(chunk, before) {
	var idx = this.chunks.indexOf(before);
	if(idx >= 0) {
		this.chunks.splice(idx, 0, chunk);
	} else {
		throw new Error("before chunk not found");
	}
	chunk.entrypoints.push(this);
};

Entrypoint.prototype.getFiles = function() {
	var files = [];

	for(var chunkIdx = 0; chunkIdx < this.chunks.length; chunkIdx++) {
		for(var fileIdx = 0; fileIdx < this.chunks[chunkIdx].files.length; fileIdx++) {
			if(files.indexOf(this.chunks[chunkIdx].files[fileIdx]) === -1) {
				files.push(this.chunks[chunkIdx].files[fileIdx]);
			}
		}
	}

	return files;
}

Entrypoint.prototype.getSize = function(compilation) {
	var files = this.getFiles();

	return files
		.map(function(file) {
			return compilation.assets[file].size()
		})
		.reduce(function(currentSize, nextSize) {
			return currentSize + nextSize
		}, 0);
}
