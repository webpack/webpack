"use strict";
const webpack = require("webpack");

const baseConfig = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	plugins: [new webpack.optimize.UglifyJsPlugin({
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
		usedExports: true,
	}
};

module.exports = [
	undefined,
	"UglifyJs",
	/UglifyJs/,
	warnings => true,
	["UglifyJs"],
	[/UglifyJs/],
	[
		warnings => true
	]
].map(filter => Object.assign({}, baseConfig, {
	stats: Object.assign({}, baseConfig.stats, { warningsFilter: filter })
}));
