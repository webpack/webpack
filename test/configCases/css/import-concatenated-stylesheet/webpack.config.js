"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			},
			{
				test: /outer\.css$/,
				generator: {
					esModule: false
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
