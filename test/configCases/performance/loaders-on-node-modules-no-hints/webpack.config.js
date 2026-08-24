"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				// No 'exclude', which is the mistake the hint is about.
				loader: path.resolve(__dirname, "identity-loader.js")
			}
		]
	},
	performance: {
		hints: false,
		loadersOnNodeModules: true
	}
};
