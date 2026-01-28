"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: {
		main: "./example"
	},
	optimization: {
		runtimeChunk: true
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].chunkhash.js",
		chunkFilename: "[name].chunkhash.js"
	}
};

module.exports = config;
