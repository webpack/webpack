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
				test: /style\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
