"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {boolean} concatenateModules concatenate modules
 * @returns {Configuration} configuration
 */
const variant = (concatenateModules) => ({
	name: concatenateModules ? "concatenated" : "separate",
	target: ["web", "es5"],
	mode: "production",
	output: {
		filename: `${concatenateModules ? "concatenated" : "separate"}.js`
	},
	experiments: {
		css: true
	},
	module: {
		generator: {
			"css/auto": {
				localIdentName: "[local]"
			}
		}
	},
	optimization: {
		minimize: false,
		mangleExports: false,
		concatenateModules
	}
});

// An object literal key `__proto__` needs a computed key to be an own property,
// which an es5 target cannot parse.
/** @type {Configuration[]} */
module.exports = [variant(false), variant(true)];
