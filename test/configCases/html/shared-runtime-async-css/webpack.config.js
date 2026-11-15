"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	devtool: false,
	entry: {
		"page-a": "./page-a.html",
		"page-b": "./page-b.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		cssChunkFilename: "[name].chunk.css"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /shared\.css$/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	experiments: { html: true, css: true }
};
