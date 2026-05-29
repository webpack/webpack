"use strict";

const rules = [
	{
		test: /text\.css$/,
		type: "css/auto",
		parser: { exportType: "text" }
	},
	{
		test: /sheet\.css$/,
		type: "css/auto",
		parser: { exportType: "css-style-sheet" }
	},
	{
		test: /inject\.css$/,
		type: "css/auto",
		parser: { exportType: "style" }
	}
];

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "full-hash",
		devtool: false,
		target: "web",
		mode: "development",
		output: {
			filename: "bundle0.js",
			publicPath: "https://example.com/[fullhash]/",
			assetModuleFilename: "images/[name][ext]"
		},
		module: { rules },
		experiments: { css: true }
	},
	{
		name: "sliced-hash",
		devtool: false,
		target: "web",
		mode: "development",
		output: {
			filename: "bundle1.js",
			publicPath: "https://example.com/[fullhash:8]/",
			assetModuleFilename: "images/[name][ext]"
		},
		module: { rules },
		experiments: { css: true }
	}
];
