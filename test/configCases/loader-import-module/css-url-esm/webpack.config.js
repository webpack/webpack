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
		rules: [
			{
				dependency: "url",
				oneOf: [
					{
						resourceQuery: /inline/,
						type: "asset/inline"
					},
					{
						type: "asset/resource",
						generator: {
							filename: "assets/[name][ext]"
						}
					}
				]
			},
			{
				test: /stylesheet\.js$/,
				use: "./loader",
				type: "asset/source"
			}
		]
	}
};
