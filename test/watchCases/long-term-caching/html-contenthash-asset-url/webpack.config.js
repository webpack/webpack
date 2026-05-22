"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: {
		__dirname: false
	},
	output: {
		filename: "bundle.js",
		htmlFilename: "[name].[contenthash].html",
		htmlChunkFilename: "[name].[contenthash].html",
		assetModuleFilename: "[name].[contenthash][ext]"
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
		realContentHash: false
	}
};
