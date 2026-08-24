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
				exclude: /node_modules/,
				loader: path.resolve(__dirname, "identity-loader.js")
			}
		]
	},
	performance: {
		hints: "warning",
		loadersOnNodeModules: true
	}
};
