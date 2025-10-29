"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		devtool: false,
		entry: {
			bundle0: "./entry1.js"
		},
		output: {
			filename: "[name].js"
		},
		optimization: {
			runtimeChunk: true
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].map",
				test: (name) => name === "bundle0.js"
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].runtime.map",
				test: /runtime~bundle0\.js/
			})
		]
	},
	{
		entry: {
			bundle1: "./entry2.js"
		},
		devtool: false,
		output: {
			filename: "[name].js"
		},
		optimization: {
			runtimeChunk: true
		},
		plugins: [
			new webpack.EvalDevToolModulePlugin({
				filename: "[file].map",
				test: "bundle1.js"
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].runtime.map",
				test: ["runtime~bundle1.js"]
			})
		]
	}
];
