"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		x: "./x.css",
		a: "./a.css"
	},
	output: { filename: "[name].js" },
	node: { __dirname: false },
	experiments: { css: true }
};
