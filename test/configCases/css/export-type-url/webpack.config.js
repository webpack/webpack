"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	mode: "development",
	output: {
		cssFilename: "bundle.[name].[contenthash].css"
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
	},
	module: {
		rules: [
			{
				test: /url\.css$/,
				type: "css/module"
			}
		]
	}
};
