/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} WaterfallDetails
 * @property {string[]} chain the chunk groups making up the chain, outermost first
 * @property {number} size the bytes the chain loads in total
 */

class AsyncChunkWaterfallWarning extends WebpackError {
	/**
	 * Creates an instance of AsyncChunkWaterfallWarning.
	 * @param {WaterfallDetails[]} waterfalls the chains that are too deep
	 * @param {number} depth the depth the deepest of them reaches
	 */
	constructor(waterfalls, depth) {
		const list = waterfalls
			.map((it) => `\n  ${it.chain.join(" → ")} (${it.size} bytes)`)
			.join("");

		super(
			`async chunk waterfall: ${waterfalls.length} ${waterfalls.length === 1 ? "chain loads" : "chains load"} ${depth} levels deep:${list}\nA chunk cannot be requested until the one importing it has arrived and run, so each level costs a round trip before anything below it starts. Importing the deeper modules from the entry, or giving them one 'webpackPrefetch' hint, lets them be fetched together.\nFor more info visit https://webpack.js.org/api/module-methods/#magic-comments`
		);

		/** @type {string} */
		this.name = "AsyncChunkWaterfallWarning";
	}
}

module.exports = AsyncChunkWaterfallWarning;
