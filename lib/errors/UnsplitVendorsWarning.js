/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} UnsplitVendorChunkDetails
 * @property {string} name
 * @property {number} vendorModules how many of its modules come from node_modules
 * @property {number} vendorSize bytes those modules contribute
 */

class UnsplitVendorsWarning extends WebpackError {
	/**
	 * Creates an instance of UnsplitVendorsWarning.
	 * @param {UnsplitVendorChunkDetails[]} chunks the worst offenders, largest vendor size first
	 */
	constructor(chunks) {
		const list = chunks
			.map(
				(chunk) =>
					`\n  ${chunk.name} (${chunk.vendorModules} modules from node_modules, ${formatSize(
						chunk.vendorSize
					)})`
			)
			.join("");

		super(
			`unsplit vendors: initial chunks carry node_modules code next to application code:${list}\nThe dependencies then get a new hash on every application change, so returning visitors download them again. 'optimization.splitChunks' can move them into a chunk of their own.\nFor more info visit https://webpack.js.org/plugins/split-chunks-plugin/`
		);

		/** @type {string} */
		this.name = "UnsplitVendorsWarning";
	}
}

module.exports = UnsplitVendorsWarning;
