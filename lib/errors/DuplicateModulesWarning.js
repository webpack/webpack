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
 * @property {string[]} entrypoints the entrypoints those chunks belong to, when more than one
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
			.map((module) => {
				// Which entrypoints pay for it is the actionable part, so it leads
				// where the copies are spread across more than one.
				const where =
					module.entrypoints.length > 1
						? `in ${module.entrypoints.join(", ")}, ${module.chunks} chunks`
						: `in ${module.chunks} chunks`;

				return `\n  ${module.name} (${where}, ${formatSize(module.wasted)} extra)`;
			})
			.join("");

		super(
			`duplicate modules: copies of the same module across chunks add ${formatSize(
				wasted
			)}:${list}\nA module reached from several chunks is emitted into each of them unless a shared chunk holds it. 'optimization.splitChunks' can pull it into one, with 'chunks: "all"' where the copies are in different entrypoints.\nFor more info visit https://webpack.js.org/plugins/split-chunks-plugin/`
		);

		/** @type {string} */
		this.name = "DuplicateModulesWarning";
	}
}

module.exports = DuplicateModulesWarning;
