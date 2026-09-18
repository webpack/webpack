"use strict";

const path = require("path");

/** @type {import("../../").Configuration} */
module.exports = {
	mode: "development",
	context: __dirname,
	entry: "./index.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
		assetModuleFilename: "[name][ext]",
		clean: true
	},
	// Every module type the playground demonstrates, so a change to one of
	// them can be watched update in a browser rather than in a test log.
	experiments: { css: true },
	module: {
		rules: [{ test: /\.svg$/, type: "asset/resource" }]
	},
	devServer: {
		hot: true,
		open: false,
		port: 8080,
		static: { directory: __dirname, watch: false }
	},
	devtool: "source-map"
};
