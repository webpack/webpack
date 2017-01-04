/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
class ChunkRenderError extends Error {
	constructor(chunk, file, error) {
		super();
		this.chunk = chunk;
		this.file = file;
		this.error = error;
		this.name = "ChunkRenderError";
		Error.captureStackTrace(this, ChunkRenderError);
		this.message = error.message;
		this.details = error.stack;
	}
}
module.exports = ChunkRenderError;
