"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	target: "web",
	mode: "production",
	devtool: false,
	experiments: { css: true },
	optimization: {
		usedExports: true,
		mangleExports: false,
		concatenateModules: false,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			}
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
