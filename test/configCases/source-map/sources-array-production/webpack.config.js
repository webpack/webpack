"use strict";

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	plugins: [
		new UglifyJSPlugin({
			sourceMap: true
		})
	]
};
