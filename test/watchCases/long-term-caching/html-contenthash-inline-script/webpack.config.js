"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: {
		__dirname: false
	},
	output: {
		filename: "[name].[contenthash].js",
		chunkFilename: "[name].[contenthash].js",
		htmlFilename: "[name].[contenthash].html",
		htmlChunkFilename: "[name].[contenthash].html"
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named"
	}
};
