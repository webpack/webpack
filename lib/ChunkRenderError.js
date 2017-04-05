/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

class ChunkRenderError extends WebpackError {
	constructor(chunk, file, error) {
		super();

		this.name = "ChunkRenderError";
		this.error = error;
		this.message = error.message;
		this.details = error.stack;
		this.file = file;
		this.chunk = chunk;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ChunkRenderError;
