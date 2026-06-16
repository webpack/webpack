"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	experiments: { outputModule: true },
	output: {
		module: true,
		library: { type: "module" },
		publicPath: "auto",
		assetModuleFilename: "[name][ext]",
		filename: "bundle.mjs"
	},
	module: {
		rules: [{ test: /\.png$/, type: "asset/resource" }]
	}
};
