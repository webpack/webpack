/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} CappedSplitDetails
 * @property {string} cacheGroup the cache group whose split was refused
 * @property {string} chunk the chunk it would have been taken out of
 * @property {string} limit the option that refused it
 * @property {number} maxRequests the value that option had
 * @property {number} modules how many modules the split would have moved
 */

class SplitChunksCappedWarning extends WebpackError {
	/**
	 * Creates an instance of SplitChunksCappedWarning.
	 * @param {CappedSplitDetails[]} splits the refused splits, most modules first
	 */
	constructor(splits) {
		const list = splits
			.map(
				(split) =>
					`\n  cacheGroup '${split.cacheGroup}' out of ${split.chunk} (${split.modules} modules, ${split.limit} is ${split.maxRequests})`
			)
			.join("");

		super(
			`split chunks capped: 'optimization.splitChunks' refused these splits because the chunk already had as many requests as it is allowed:${list}\nThe modules stayed where they were, so the cache group did not take effect. Raising the limit lets the split happen, at the cost of more parallel requests.\nFor more info visit https://webpack.js.org/plugins/split-chunks-plugin/`
		);

		/** @type {string} */
		this.name = "SplitChunksCappedWarning";
	}
}

module.exports = SplitChunksCappedWarning;
