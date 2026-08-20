/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} EntrypointOverlapDetails
 * @property {string} name
 * @property {string[]} entrypoints the entrypoints that each ship a copy
 * @property {number} wasted bytes the copies past the first cost
 */

class EntrypointOverlapWarning extends WebpackError {
	/**
	 * Creates an instance of EntrypointOverlapWarning.
	 * @param {EntrypointOverlapDetails[]} modules the worst offenders, largest waste first
	 * @param {number} wasted bytes all overlapping copies cost together
	 */
	constructor(modules, wasted) {
		const list = modules
			.map(
				(module) =>
					`\n  ${module.name} (in ${module.entrypoints.join(", ")}, ${formatSize(
						module.wasted
					)} extra)`
			)
			.join("");

		super(
			`entrypoint overlap: modules shipped by more than one entrypoint add ${formatSize(
				wasted
			)}:${list}\nEach entrypoint downloads its own copy. 'optimization.splitChunks' with 'chunks: "all"' can move them into a chunk every entrypoint shares.\nFor more info visit https://webpack.js.org/plugins/split-chunks-plugin/`
		);

		/** @type {string} */
		this.name = "EntrypointOverlapWarning";
	}
}

module.exports = EntrypointOverlapWarning;
