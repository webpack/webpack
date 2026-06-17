"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true,
		outputModule: true
	},
	output: {
		module: true
	}
};
