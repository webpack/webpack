"use strict";

/**
 * @param {number} index config index
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {import("../../../../").Configuration} config
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

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(0, false), config(1, true)];
