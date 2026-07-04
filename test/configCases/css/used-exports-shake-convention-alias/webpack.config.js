"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	target: "web",
	mode: "production",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				generator: {
					exportsConvention: "camel-case"
				}
			}
		]
	},
	optimization: {
		usedExports: true,
		mangleExports: false,
		concatenateModules: false,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
