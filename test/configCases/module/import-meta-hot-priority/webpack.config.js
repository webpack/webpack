"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

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
	optimization: {
		usedExports: false,
		sideEffects: false
	},
	module: {
		rules: [
			{
				test: /hot-import-meta-false\.js$/,
				parser: {
					importMeta: false
				}
			},
			{
				test: /hot-field-disabled\.js$/,
				parser: {
					importMeta: {
						webpackHot: false
					}
				}
			}
		]
	},
	plugins: [new HotModuleReplacementPlugin()]
};
