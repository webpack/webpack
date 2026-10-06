"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	devtool: false,
	entry: { a: "./index.js", b: "./b.js" },
	output: { filename: "[name].js" },
	optimization: {
		moduleIds: "named",
		chunkIds: "named",
		runtimeChunk: false,
		splitChunks: {
			chunks: "initial",
			minSize: 0,
			cacheGroups: {
				shared: { test: /shared/, name: "shared", enforce: true }
			}
		}
	},
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
