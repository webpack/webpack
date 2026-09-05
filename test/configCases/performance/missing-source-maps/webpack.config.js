"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: "source-map",
	optimization: {
		minimize: false
	},
	module: {
		rules: [
			{
				test: /[/\\]lost\.js$/,
				use: path.resolve(__dirname, "losing-loader.js")
			},
			{
				test: /[/\\]kept\.js$/,
				use: path.resolve(__dirname, "mapping-loader.js")
			}
		]
	},
	performance: {
		hints: "warning",
		sourceMaps: true
	}
};
