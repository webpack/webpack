"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	// `ensure` runs first; it needs no other runtime, so a missing requirement throws
	entry: {
		ensure: "./ensure.js",
		main: "./index.js"
	},
	output: {
		filename: "[name].js"
	}
};
