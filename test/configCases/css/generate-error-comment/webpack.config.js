"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	module: {
		rules: [{ test: /\.css$/, type: "css", use: "./loader.js" }]
	},
	experiments: {
		css: true
	},
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
