"use strict";
const webpack = require("../../../");

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
		modules: false,
		providedExports: false,
		usedExports: false,
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
	],
	"should not filter",
	/should not filter/,
	warnings => false,
	["should not filter"],
	[/should not filter/],
	[
		warnings => false
	]
].map(filter => Object.assign({}, baseConfig, {
	stats: Object.assign({}, baseConfig.stats, { warningsFilter: filter })
}));
