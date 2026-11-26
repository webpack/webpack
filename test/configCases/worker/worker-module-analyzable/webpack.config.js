"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		publicPath: "auto"
	}
};
