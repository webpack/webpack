/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Chunk").ChunkOptions} ChunkOptions */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */

class IncompatibleChunkOptionsError extends WebpackError {
	/**
	 * Creates an instance of IncompatibleChunkOptionsError.
	 * @param {string} chunkName Name of Chunk
	 * @param {ChunkOptions} chunkOptions1 chunkOptions1
	 * @param {ChunkOptions} chunkOptions2 chunkOptions2
	 * @param {Module=} module module tied to dependency
	 * @param {DependencyLocation=} loc location of dependency
	 */
	constructor(chunkName, chunkOptions1, chunkOptions2, module, loc) {
		super(
			`${
				chunkName ? `The chunk "${chunkName}"` : "A chunk"
			} is referenced by multiple runtimes with different chunk options (e. g. chunkFormat, chunkFilename or initialChunkFilename).
Prevent chunk sharing by using layers, e. g. add 'layer: "..."' to the place where the different chunk options are specified.
Avoid to force chunk sharing by using 'splitChunk.cacheGroups.*.name' without filtering by layer (with 'splitChunk.cacheGroups.*.layer').
${JSON.stringify(chunkOptions1, null, 2)}
  vs.
${JSON.stringify(chunkOptions2, null, 2)}`
		);

		this.name = "IncompatibleChunkOptionsError";
		this.module = module;
		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = IncompatibleChunkOptionsError;
