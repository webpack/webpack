/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import Chunk from "../graph/Chunk" */

class InvalidChunkNameWarning extends WebpackError {
	/**
	 * Warns about URL delimiters in a chunk name used for emitted assets.
	 * @param {Chunk} chunk the chunk with an invalid name
	 */
	constructor(chunk) {
		super(
			`Chunk name ${JSON.stringify(chunk.name)} contains '?' or '#'. ` +
				"Using this name in an output filename can cause chunk loading failures " +
				"or omit hashes from files on disk. " +
				"Remove these characters from chunk names, including webpackChunkName comments and splitChunks name functions."
		);

		/** @type {string} */
		this.name = "InvalidChunkNameWarning";
		/** @type {Chunk} */
		this.chunk = chunk;
	}
}

module.exports = InvalidChunkNameWarning;
