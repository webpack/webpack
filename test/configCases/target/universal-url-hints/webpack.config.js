"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	entry: "./index.js",
	output: {
		publicPath: "",
		module: true,
		assetModuleFilename: "[name][ext]",
		filename: "bundle0.mjs"
	}
};
