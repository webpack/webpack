"use strict";

const common = {
	mode: "development",
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/",
		crossOriginLoading: "anonymous"
	},
	module: {
		rules: [
			{
				test: /\.(png|css|woff2|webm)$/,
				type: "asset/resource"
			}
		]
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		name: "script",
		output: {
			...common.output,
			filename: "[name].script.js"
		}
	},
	{
		...common,
		name: "module",
		output: {
			...common.output,
			filename: "[name].module.mjs",
			module: true,
			chunkFormat: "module"
		},
		experiments: {
			outputModule: true
		}
	}
];
