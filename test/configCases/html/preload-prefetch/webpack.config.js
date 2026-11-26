"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		cssChunkFilename: "[name].chunk.css"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		css: true
	}
};
