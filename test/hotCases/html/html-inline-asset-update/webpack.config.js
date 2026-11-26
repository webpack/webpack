"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	entry: { main: "./index.js", page: "./page.html" },
	output: { filename: "[name].js" },
	node: { __dirname: false },
	experiments: {
		html: true
	}
};
