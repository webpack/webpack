"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	output: {
		pathinfo: true,
		chunkFilename: "[name].js"
	},
	optimization: {
		minimize: false,
		concatenateModules: false
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
