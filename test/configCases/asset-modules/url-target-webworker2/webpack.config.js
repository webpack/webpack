"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "webworker",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "/"
	}
};
