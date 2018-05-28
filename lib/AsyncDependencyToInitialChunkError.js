/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */

class AsyncDependencyToInitialChunkError extends WebpackError {
	/**
	 * Creates an instance of AsyncDependencyToInitialChunkError.
	 * @param {string} chunkName Name of Chunk
	 * @param {Module} module module tied to dependency
	 * @param {TODO} loc location of dependency
	 */
	constructor(chunkName, module, loc) {
		super();

		this.name = "AsyncDependencyToInitialChunkError";
		this.message = `It's not allowed to load an initial chunk on demand. The chunk name "${chunkName}" is already used by an entrypoint.`;
		this.module = module;
		this.origin = module;
		this.originLoc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = AsyncDependencyToInitialChunkError;
