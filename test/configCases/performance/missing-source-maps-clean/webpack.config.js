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
				test: /[/\\]kept\.js$/,
				use: path.resolve(__dirname, "mapping-loader.js")
			}
		]
	},
	performance: {
		hints: "warning",
		missingSourceMaps: true
	}
};
