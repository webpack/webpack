"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "universal-esm",
		target: ["web", "node"],
		mode: "development",
		devtool: false,
		output: {
			publicPath: "auto",
			module: true,
			filename: "[name].mjs"
		},
		experiments: {
			outputModule: true
		},
		module: {
			rules: [
				{
					test: /\.png$/,
					type: "asset/resource"
				}
			]
		}
	}
];
