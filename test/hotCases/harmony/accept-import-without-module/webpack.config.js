"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	// `broken` reproduces the codegen crash; the runner only executes `main`.
	entry: {
		main: "./index.js",
		broken: "./broken.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [new webpack.IgnorePlugin({ resourceRegExp: /ignored/ })]
};
