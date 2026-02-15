"use strict";

const MiniCssPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: {
		main: "./a.js",
		b: { import: "./b.js", dependOn: "main" }
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{
						loader: MiniCssPlugin.loader
					},
					{
						loader: "css-loader",
						options: {
							esModule: true,
							modules: {
								namedExport: false,
								localIdentName: "[name]"
							}
						}
					}
				]
			}
		]
	},
	output: {
		filename: "[name].js",
		cssChunkFilename: "[name].css"
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
