"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {Configuration} configuration
 */
const createConfig = (name, concatenateModules) => ({
	entry: {
		module: { import: "./module.js", library: { type: "module" } },
		assign: {
			import: "./assign.js",
			library: { type: "assign", name: "global.assign" }
		}
	},
	mode: "production",
	optimization: { concatenateModules, minimize: false },
	output: {
		module: true,
		filename: concatenateModules ? "[name].mjs" : "[name]-no-concat.mjs"
	}
});

/** @type {Configuration[]} */
module.exports = [
	createConfig("concat", true),
	createConfig("no-concat", false)
];
