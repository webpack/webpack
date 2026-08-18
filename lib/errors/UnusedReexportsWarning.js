/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const formatSize = require("../util/formatSize");
const WebpackError = require("./WebpackError");

/**
 * @typedef {object} UnusedReexportDetails
 * @property {string} name
 * @property {number} size bytes the module costs
 */

class UnusedReexportsWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedReexportsWarning.
	 * @param {UnusedReexportDetails[]} modules the worst offenders, largest first
	 * @param {number} total how many modules are bundled unused
	 * @param {number} wasted bytes they cost together
	 */
	constructor(modules, total, wasted) {
		const list = modules
			.map((module) => `\n  ${module.name} (${formatSize(module.size)})`)
			.join("");

		super(
			`unused re-exports: ${total} ${
				total === 1 ? "module is" : "modules are"
			} bundled although nothing uses what they export, adding ${formatSize(
				wasted
			)}:${list}\nA module you import re-exports them, and their top-level code has side effects webpack is not allowed to drop. Setting '"sideEffects": false' in the package.json that owns them lets webpack leave them out.\nFor more info visit https://webpack.js.org/guides/tree-shaking/`
		);

		/** @type {string} */
		this.name = "UnusedReexportsWarning";
	}
}

module.exports = UnusedReexportsWarning;
