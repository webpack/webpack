"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	},
	performance: {
		hints: "warning",
		maxEntrypointSize: 100,
		maxAssetSize: 1000000
	}
};
