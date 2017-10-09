"use strict";
const webpack = require("../../");
const path = require("path");

module.exports = [
	{
		entry: {
			main: ["./example.js"]
		},
		output: {
			path: path.resolve(__dirname, "js"),
			filename: "output.js"
		},
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				minChunks: 2,
				children: true,
				deepChildren: true,
			})
		]
	},
	{
		entry: {
			main: ["./example.js"]
		},
		output: {
			path: path.resolve(__dirname, "js"),
			filename: "asyncoutput.js"
		},
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				minChunks: 2,
				async: true,
				children: true,
				deepChildren: true,
			})
		]
	}
];
