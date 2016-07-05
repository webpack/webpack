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
