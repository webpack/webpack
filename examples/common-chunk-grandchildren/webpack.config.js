"use strict";
const webpack = require("../../");
const path = require("path");

module.exports = [
	{
		// mode: "development || "production",
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
		],
		optimization: {
			occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
		}
	},
	{
		// mode: "development || "production",
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
		],
		optimization: {
			occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
		}
	}
];
