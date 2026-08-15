"use strict";

/** @type {import("../../../../").Configuration} */
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
