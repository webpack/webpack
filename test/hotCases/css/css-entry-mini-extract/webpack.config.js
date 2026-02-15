"use strict";

const MiniCssPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: {
		"css-entry": "./entry.css",
		test: "./index.js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: MiniCssPlugin.loader
			}
		]
	},
	output: {
		filename: "[name].js",
		cssChunkFilename: "[name].css"
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				styles: {
					type: "css/mini-extract",
					enforce: true
				}
			}
		}
	},
	target: "web",
	node: {
		__dirname: false
	},
	plugins: [
		new MiniCssPlugin({
			experimentalUseImportModule: true
		})
	]
};
