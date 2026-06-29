"use strict";

const { EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "node",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	},
	module: {
		rules: [
			{
				test: /empty-options\.js$/,
				parser: {
					importMeta: {}
				}
			},
			{
				test: /disabled-fields\.js$/,
				parser: {
					importMeta: {
						dirname: false,
						env: false,
						filename: false,
						main: false,
						url: false,
						customRuntimeField: false,
						webpack: false,
						webpackContext: false,
						webpackHot: false
					}
				}
			}
		]
	},
	plugins: [
		new EnvironmentPlugin({
			AAA: "aaa"
		})
	]
};
