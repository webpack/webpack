"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: {
		a: "./x.js",
		b: "./b.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		minimize: false
	}
};
