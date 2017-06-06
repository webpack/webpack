"use strict";

const webpack = require("../../../../");

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "[file].map",
			cheap: true
		}),
		new UglifyJSPlugin({
			sourceMap: true
		})
	]
};
