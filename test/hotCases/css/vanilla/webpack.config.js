"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		cssChunkFilename: "[name].css"
	},
	node: {
		__dirname: false
	},
	experiments: {
		css: true
	}
};
