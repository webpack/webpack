"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		pathinfo: false,
		assetModuleFilename: "handled-[name][ext]"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
