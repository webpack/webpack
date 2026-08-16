/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} DuplicateModuleDetails
 * @property {string} name
 * @property {number} chunks how many chunks carry a copy
 * @property {number} wasted bytes the extra copies cost
 */

class DuplicateModulesWarning extends WebpackError {
	/**
	 * Creates an instance of DuplicateModulesWarning.
	 * @param {DuplicateModuleDetails[]} modules the worst offenders, largest waste first
	 * @param {number} wasted bytes all duplicated copies cost together
	 */
	constructor(modules, wasted) {
		const list = modules
			.map(
				(module) =>
					`\n  ${module.name} (in ${module.chunks} chunks, ${formatSize(
						module.wasted
					)} extra)`
			)
			.join("");

		super(
			`duplicate modules: copies of the same module across chunks add ${formatSize(
				wasted
			)}:${list}\nA module reached from several chunks is emitted into each of them unless a shared chunk holds it. 'optimization.splitChunks' can pull it into one.\nFor more info visit https://webpack.js.org/plugins/split-chunks-plugin/`
		);

		/** @type {string} */
		this.name = "DuplicateModulesWarning";
	}
}

module.exports = DuplicateModulesWarning;
