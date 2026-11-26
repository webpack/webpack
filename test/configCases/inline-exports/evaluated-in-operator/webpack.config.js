"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {number} index config index
 * @param {object} options options
 * @param {boolean} options.concatenateModules concatenateModules
 * @returns {Configuration} config
 */
const config = (index, { concatenateModules }) => ({
	mode: "production",
	entry: "./index.js",
	output: {
		filename: `bundle.${index}.js`
	},
	optimization: {
		concatenateModules,
		moduleIds: "named",
		inlineExports: true,
		minimize: false
	}
});

/** @type {Configuration[]} */
module.exports = [
	config(0, { concatenateModules: true }),
	config(1, { concatenateModules: false })
];
