"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			ignoreList: [/ignored\.js/]
		})
	]
};
