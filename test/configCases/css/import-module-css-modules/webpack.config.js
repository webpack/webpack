"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		generator: {
			"css/auto": {
				localIdentName: "[local]"
			},
			"css/module": {
				localIdentName: "[local]"
			}
		},
		rules: [
			{
				test: /classes\.js$/,
				use: "./loader"
			},
			{
				test: /\.css$/,
				resourceQuery: /module/,
				type: "css/module"
			},
			{
				test: /\.css$/,
				resourceQuery: /exportsOnly/,
				generator: {
					exportsOnly: true
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
