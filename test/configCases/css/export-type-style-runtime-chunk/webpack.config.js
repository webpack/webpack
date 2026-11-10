"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["development", "production"].map((mode, index) => ({
	target: "web",
	mode,
	devtool: false,
	output: {
		filename: `[name].${index}.js`
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
}));
