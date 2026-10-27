"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	devtool: "source-map",
	node: {
		__dirname: false
	},
	output: {
		filename: "[name].[contenthash].js",
		clean: true
	},
	optimization: {
		minimize: false,
		realContentHash: true
	}
};
