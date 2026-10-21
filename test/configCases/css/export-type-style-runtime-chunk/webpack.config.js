"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	},
	optimization: {
		runtimeChunk: "single"
	}
};
