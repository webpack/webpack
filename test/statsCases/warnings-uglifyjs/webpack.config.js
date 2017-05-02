"use strict";
const webpack = require("../../../");

module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	plugins: [new webpack.optimize.UglifyJsPlugin({
		warningsFilter: function(filename) {
			return /a\.js$/.test(filename);
		},
		sourceMap: true,
		compress: {
			warnings: true,
		},
		mangle: false,
		beautify: true,
		comments: false
	})],
	stats: {
		chunkModules: false,
		modules: true,
		providedExports: true,
		usedExports: true
	}
};
