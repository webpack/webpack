"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "[file].map",
			ignoreList: [/ignored\.js/]
		})
	]
};
