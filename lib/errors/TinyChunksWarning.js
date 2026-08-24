/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} TinyChunkDetails
 * @property {string} name the chunk, by name or by id
 * @property {number} size bytes it carries
 */

class TinyChunksWarning extends WebpackError {
	/**
	 * Creates an instance of TinyChunksWarning.
	 * @param {TinyChunkDetails[]} chunks the smallest of them
	 * @param {number} total how many fall under the floor in all
	 * @param {number} totalSize bytes they carry between them
	 */
	constructor(chunks, total, totalSize) {
		const list = chunks
			.map((chunk) => `\n  ${chunk.name} (${formatSize(chunk.size)})`)
			.join("");

		super(
			`tiny chunks: ${total} chunks are loaded on demand but carry less than 'optimization.splitChunks.minSize', ${formatSize(
				totalSize
			)} between them:${list}\nEach costs a request of its own, and that option is already the size below which webpack itself declines to make a chunk. Giving several 'import()' calls one 'webpackChunkName' groups them into a single chunk.\nFor more info visit https://webpack.js.org/api/module-methods/#magic-comments`
		);

		/** @type {string} */
		this.name = "TinyChunksWarning";
	}
}

module.exports = TinyChunksWarning;
