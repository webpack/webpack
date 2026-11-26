"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		cssChunkFilename: "[name].css"
	},
	experiments: {
		css: true
	}
};
