"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	output: {
		module: true,
		publicPath: "auto"
	},
	experiments: {
		outputModule: true,
		asyncWebAssembly: true
	}
};
