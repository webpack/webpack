"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "js-at-root",
		devtool: false,
		target: "web",
		mode: "development",
		output: {
			// JS at root, CSS in "css/" subdirectory
			// undoPath from cssChunkFilename = "../", but non-link should use ""
			filename: "bundle0.js",
			cssFilename: "css/[name].css",
			cssChunkFilename: "css/[name].css",
			publicPath: "auto",
			assetModuleFilename: "images/[name][ext]"
		},
		module: {
			rules: [
				{
					test: /style\.css$/,
					type: "css/auto",
					parser: { exportType: "text" }
				},
				{
					test: /style-for-sheet\.css$/,
					type: "css/auto",
					parser: { exportType: "css-style-sheet" }
				},
				{
					test: /style-for-inject\.css$/,
					type: "css/auto",
					parser: { exportType: "style" }
				}
			]
		},
		experiments: { css: true }
	},
	{
		name: "js-in-subdir",
		devtool: false,
		target: "web",
		mode: "development",
		output: {
			// JS in "js/" subdirectory — undoPath from JS path would be "../"
			// but non-link url() resolves relative to document, so still ""
			filename: "js/bundle1.js",
			cssFilename: "css/[name].css",
			cssChunkFilename: "css/[name].css",
			publicPath: "auto",
			assetModuleFilename: "images/[name][ext]"
		},
		module: {
			rules: [
				{
					test: /style\.css$/,
					type: "css/auto",
					parser: { exportType: "text" }
				},
				{
					test: /style-for-sheet\.css$/,
					type: "css/auto",
					parser: { exportType: "css-style-sheet" }
				},
				{
					test: /style-for-inject\.css$/,
					type: "css/auto",
					parser: { exportType: "style" }
				}
			]
		},
		experiments: { css: true }
	}
];
