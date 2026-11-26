"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		main: {
			import: "./index.js",
			library: { type: "module" }
		}
	},
	output: {
		module: true,
		filename: "[name].mjs"
	},
	optimization: {
		runtimeChunk: "single"
	},
	mode: "development",
	devtool: false
};
