"use strict";

const path = require("path");

/** @type {import("../../").Configuration} */
module.exports = {
	mode: "development",
	context: __dirname,
	// The page is the entry: `experiments.html` makes it a module, and webpack
	// injects the JS and CSS it builds from the <script> it finds.
	entry: { page: "./index.html" },
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		assetModuleFilename: "[name][ext]",
		clean: true
	},
	experiments: {
		css: true,
		html: true,
		asyncWebAssembly: true,
		deferImport: true,
		sourceImport: true
	},
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" },
			{ test: /\.svg$/, resourceQuery: /inline/, type: "asset/inline" },
			{ test: /\.svg$/, type: "asset/resource" },
			{ test: /\.txt$/, type: "asset/source" }
		]
	},
	optimization: { chunkIds: "named" },
	devServer: {
		hot: true,
		open: false,
		port: 8080,
		static: false
	},
	devtool: "source-map"
};
