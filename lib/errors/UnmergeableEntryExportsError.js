/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import Chunk from "../graph/Chunk" */

/**
 * Error raised when an entry asks for `entryExports: "all"` but webpack cannot build
 * the merged exports object from its modules.
 */
class UnmergeableEntryExportsError extends WebpackError {
	/**
	 * Captures the chunk carrying the entry and why its exports cannot be merged.
	 * @param {Chunk} chunk the chunk carrying the entry
	 * @param {string} reason what stands in the way, as a sentence fragment
	 */
	constructor(chunk, reason) {
		super(
			`Entry "${chunk.name || chunk.id}" can't merge the exports of its modules because ${reason}. Set 'library.entryExports' back to 'last', or re-export the modules from a single entry module instead.`
		);

		/** @type {string} */
		this.name = "UnmergeableEntryExportsError";
		/** @type {Chunk} */
		this.chunk = chunk;
	}
}

module.exports = UnmergeableEntryExportsError;
