/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ChunkRenderError(chunk, file, error) {
	Error.call(this);
	Error.captureStackTrace(this, ChunkRenderError);
	this.name = "ChunkRenderError";
	this.error = error;
	this.message = error.message;
	this.details = error.stack;
	this.file = file;
	this.chunk = chunk;
}
module.exports = ChunkRenderError;

ChunkRenderError.prototype = Object.create(Error.prototype);
