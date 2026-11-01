/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import Chunk from "../graph/Chunk" */

class InvalidChunkNameWarning extends WebpackError {
	/**
	 * Warns that a chunk name's URL delimiters were replaced in its output filenames.
	 * @param {Chunk} chunk the chunk with an invalid name
	 * @param {string} safeName the name its output filenames use instead
	 */
	constructor(chunk, safeName) {
		super(
			`Chunk name ${JSON.stringify(chunk.name)} contains '?' or '#', which a URL or ` +
				`the file written to disk would cut off, so its output filenames use ${JSON.stringify(safeName)}. ` +
				"Remove these characters from chunk names, including webpackChunkName comments and splitChunks name functions."
		);

		/** @type {string} */
		this.name = "InvalidChunkNameWarning";
		/** @type {Chunk} */
		this.chunk = chunk;
	}
}

module.exports = InvalidChunkNameWarning;
