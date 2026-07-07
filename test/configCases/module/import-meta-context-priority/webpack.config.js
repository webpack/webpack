"use strict";

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
				test: /context-legacy-disabled\.js$/,
				parser: {
					importMeta: {},
					importMetaContext: false
				}
			},
			{
				test: /context-field-enabled\.js$/,
				parser: {
					importMeta: {
						webpackContext: true
					},
					importMetaContext: false
				}
			},
			{
				test: /context-field-disabled\.js$/,
				parser: {
					importMeta: {
						webpackContext: false
					},
					importMetaContext: true
				}
			},
			{
				test: /context-import-meta-false\.js$/,
				parser: {
					importMeta: false
				}
			},
			{
				test: /context-legacy-overridden\.js$/,
				parser: {
					importMeta: false,
					importMetaContext: true
				}
			}
		]
	}
};
