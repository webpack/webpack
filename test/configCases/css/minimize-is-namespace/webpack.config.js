"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		publicPath: "",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		// Bundled CSS does not support @namespace; minify the standalone asset.
		rules: [{ test: /\.css$/, type: "asset/resource" }]
	},
	optimization: {
		minimize: { css: { extractComments: false } },
		minimizer: ["..."]
	},
	experiments: { css: true }
};
