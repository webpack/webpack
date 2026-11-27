"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		module: true,
		filename: "[name].mjs"
	},
	target: ["node", "es2020"],
	optimization: {
		minimize: false,
		concatenateModules: false,
		runtimeChunk: "single"
	}
};
