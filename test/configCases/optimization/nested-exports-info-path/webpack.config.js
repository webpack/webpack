"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {number} index config index
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {Configuration} config
 */
const config = (index, concatenateModules) => ({
	mode: "production",
	output: {
		filename: `bundle.${index}.js`
	},
	optimization: {
		usedExports: true,
		providedExports: true,
		mangleExports: true,
		concatenateModules,
		minimize: false
	}
});

/** @type {Configuration[]} */
module.exports = [config(0, false), config(1, true)];
