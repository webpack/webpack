"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node14",
	entry: "./index.js",
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		filename: "bundle.mjs"
	}
};
