"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	optimization: {
		minimize: false
	}
};
