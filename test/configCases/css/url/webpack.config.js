const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "web",
		mode: "development",
		devtool: false,
		experiments: {
			css: true
		},
		output: {
			assetModuleFilename: "[name].[hash][ext][query][fragment]"
		},
		resolve: {
			alias: {
				"alias-url.png": path.resolve(__dirname, "img.png"),
				"alias-url-1.png": false
			}
		},
		externals: {
			"external-url.png": "asset ./img.png",
			"external-url-2.png": "test",
			"schema:test": "asset 'img.png'"
		},
		plugins: [new webpack.IgnorePlugin({ resourceRegExp: /ignore\.png/ })]
	},
	{
		target: "web",
		mode: "development",
		devtool: false,
		experiments: {
			css: true
		},
		module: {
			parser: {
				css: {
					url: false
				}
			}
		},
		output: {
			assetModuleFilename: "[name].[hash][ext][query][fragment]"
		}
	}
];
