/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import Chunk from "../graph/Chunk" */

/**
 * Warning raised when several modules of an `entryExports: "all"` entry bind the same
 * export name, which leaves the name out of the merged exports.
 */
class ConflictingEntryExportsWarning extends WebpackError {
	/**
	 * Captures the entry's chunk and the names it cannot expose.
	 * @param {Chunk} chunk the chunk carrying the entry
	 * @param {string[]} names the conflicting export names
	 */
	constructor(chunk, names) {
		super(
			`Entry "${chunk.name || chunk.id}" contains conflicting exports for the ${
				names.length === 1 ? "name" : "names"
			} ${names.map((name) => `'${name}'`).join(", ")}, so ${
				names.length === 1 ? "it is" : "they are"
			} not exposed by the merged exports.`
		);

		/** @type {string} */
		this.name = "ConflictingEntryExportsWarning";
		/** @type {Chunk} */
		this.chunk = chunk;
	}
}

module.exports = ConflictingEntryExportsWarning;
