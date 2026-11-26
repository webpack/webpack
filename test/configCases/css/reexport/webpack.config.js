"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = ["development", "production"].map((mode, idx) => ({
	name: mode,
	devtool: false,
	entry: "./index.js",
	mode,
	target: "web",
	output: {
		filename: `bundle${idx}.js`
	},
	optimization: {
		minimize: false
	},
	experiments: {
		css: true
	}
}));
