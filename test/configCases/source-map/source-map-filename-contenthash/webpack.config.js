"use strict";

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	output: {
		sourceMapFilename: "[file]-[contenthash].map?[contenthash]-[contenthash]",
	},
	plugins: [
		new UglifyJSPlugin({
			sourceMap: true
		})
	]
};
