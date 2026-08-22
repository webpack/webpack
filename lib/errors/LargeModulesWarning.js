/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} LargeModuleDetails
 * @property {string} name the module, shortened for the report
 * @property {string} chunk the chunk it weighs down
 * @property {number} size bytes the module contributes
 * @property {number} chunkSize bytes the whole chunk contributes
 */

class LargeModulesWarning extends WebpackError {
	/**
	 * Creates an instance of LargeModulesWarning.
	 * @param {LargeModuleDetails[]} modules the worst offenders, largest first
	 * @param {number} total how many dominating modules there are in all
	 */
	constructor(modules, total) {
		const list = modules
			.map((module) => {
				const share = Math.round((module.size / module.chunkSize) * 100);

				return `\n  ${module.name} is ${share}% of '${module.chunk}' (${formatSize(
					module.size
				)} of ${formatSize(module.chunkSize)})`;
			})
			.join("");

		super(
			`large modules: ${total} ${total === 1 ? "module carries" : "modules carry"} most of the chunk ${total === 1 ? "it is" : "they are"} in:${list}\nEverything else in the chunk together weighs less than this one module, so splitting it out with 'optimization.splitChunks', loading it on demand, or replacing it is what changes the size.\nFor more info visit https://webpack.js.org/guides/code-splitting/`
		);

		/** @type {string} */
		this.name = "LargeModulesWarning";
	}
}

module.exports = LargeModulesWarning;
