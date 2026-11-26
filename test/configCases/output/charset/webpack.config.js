"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		charset: false
	},
	performance: {
		hints: false
	},
	experiments: {
		css: true
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	}
};
