"use strict";

const path = require("node:path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 30000,
			maxSize: 50000
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	]
};

module.exports = config;
