/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import Chunk from "../Chunk" */

/**
 * Error raised when an entry asks for `mergeExports` but its modules do not all
 * run during the chunk's own startup, so their exports cannot be merged.
 */
class UnmergeableEntryExportsError extends WebpackError {
	/**
	 * Captures the chunk whose entry modules run behind a chunk load.
	 * @param {Chunk} chunk the chunk carrying the entry
	 */
	constructor(chunk) {
		super(
			`Entry "${chunk.name || chunk.id}" can't merge the exports of its modules because they don't all run when this chunk starts up. Remove 'mergeExports', or remove the 'dependOn'/runtime splitting that defers them.`
		);

		/** @type {string} */
		this.name = "UnmergeableEntryExportsError";
		/** @type {Chunk} */
		this.chunk = chunk;
	}
}

module.exports = UnmergeableEntryExportsError;
