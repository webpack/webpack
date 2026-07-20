"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	entry: "./index.js",
	experiments: {
		outputModule: true
	},
	output: {
		publicPath: "",
		module: true,
		assetModuleFilename: "[name][ext]",
		filename: "bundle0.mjs"
	}
};
