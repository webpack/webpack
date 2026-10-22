"use strict";

const { DefinePlugin, EnvironmentPlugin } = require("../../../../");
const { version } = require("../../../../package.json");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "node",
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
		}),
		// Requiring package.json from the case would bundle every dependency
		// line, so an edit to any of them moves this asset in the size report.
		new DefinePlugin({
			WEBPACK_MAJOR: JSON.stringify(Number.parseInt(version, 10))
		})
	]
};
