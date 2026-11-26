"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "[file].map",
			exclude: ["vendors.js"]
		})
	]
};
