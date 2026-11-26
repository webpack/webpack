"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		module: true,
		filename: "[name].mjs"
	},
	target: ["web", "es2020"],
	optimization: {
		minimize: true,
		runtimeChunk: "single"
	}
};
