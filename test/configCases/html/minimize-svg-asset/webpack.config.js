"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { assetModuleFilename: "[name][ext]" },
	module: { rules: [{ test: /\.svg$/, type: "asset/resource" }] },
	optimization: {
		minimize: { html: { collapseWhitespace: "all" } },
		minimizer: ["..."]
	},
	experiments: { html: true }
};
