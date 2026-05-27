"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		pathinfo: false,
		chunkFilename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/sync"
			}
		]
	},
	optimization: {
		moduleIds: "named",
		inlineExports: true,
		concatenateModules: false,
		minimize: false
	},
	experiments: {
		syncWebAssembly: true
	}
};
