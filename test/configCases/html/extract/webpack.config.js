"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true
	}
};
