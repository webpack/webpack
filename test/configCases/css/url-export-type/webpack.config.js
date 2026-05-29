"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	mode: "development",
	output: {
		cssChunkFilename: "[name].[contenthash].css"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		css: true
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
