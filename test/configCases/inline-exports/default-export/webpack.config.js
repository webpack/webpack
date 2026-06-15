"use strict";

/**
 * @param {number} index config index
 * @param {object} options options
 * @param {boolean} options.concatenateModules concatenateModules
 * @returns {import("../../../../").Configuration} config
 */
const config = (index, { concatenateModules }) => ({
	mode: "production",
	entry: "./index.js",
	output: {
		filename: `bundle.${index}.js`,
		pathinfo: false
	},
	optimization: {
		concatenateModules,
		moduleIds: "named",
		inlineExports: true,
		minimize: false
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config(0, { concatenateModules: true }),
	config(1, { concatenateModules: false })
];
