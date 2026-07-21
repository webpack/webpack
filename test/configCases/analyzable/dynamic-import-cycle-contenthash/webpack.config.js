"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	optimization: {
		realContentHash: true
	},
	output: {
		module: true,
		publicPath: "auto",
		filename: "main.[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
