"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false },
	externalsPresets: { node: true },
	entry: {
		main: "./index.js",
		page: "./page.html"
	},
	output: { filename: "[name].js", publicPath: "auto" },
	experiments: { html: true }
};
