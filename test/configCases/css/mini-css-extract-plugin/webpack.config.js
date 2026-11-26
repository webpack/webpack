"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		rules: []
	},
	experiments: {
		css: true
	}
};
