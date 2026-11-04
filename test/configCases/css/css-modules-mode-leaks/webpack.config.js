"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		uniqueName: "mode-leaks"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		rules: [
			{
				test: /pure\.module\.css$/i,
				type: "css/module",
				parser: {
					pure: true
				}
			},
			{
				test: /\.module\.css$/i,
				type: "css/module"
			}
		]
	}
};
