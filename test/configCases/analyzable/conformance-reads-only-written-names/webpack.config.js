"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
