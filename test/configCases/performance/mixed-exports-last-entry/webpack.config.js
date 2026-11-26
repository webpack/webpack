"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: ["./early.js", "./index.js"],
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "commonjs2" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
