"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		main: {
			import: "./index",
			runtime: false
		}
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	}
};
