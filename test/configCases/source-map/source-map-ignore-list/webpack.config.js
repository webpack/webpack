"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
