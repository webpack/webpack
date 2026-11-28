"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		a: "./a.css",
		c: "./c.css"
	},
	output: { filename: "[name].js" },
	module: {
		rules: [{ test: /c\.css$/, use: "./wait-loader.js" }]
	},
	node: { __dirname: false },
	experiments: { css: true }
};
