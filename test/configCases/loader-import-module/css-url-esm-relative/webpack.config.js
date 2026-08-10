"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		publicPath: "/public/"
	},
	module: {
		parser: {
			javascript: {
				url: "relative"
			}
		},
		rules: [
			{
				dependency: "url",
				type: "asset/resource",
				generator: {
					filename: "assets/[name][ext]"
				}
			},
			{
				test: /stylesheet\.js$/,
				use: "./loader",
				type: "asset/source"
			}
		]
	}
};
