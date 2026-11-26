"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].mjs",
		module: true
	},
	target: "node14"
};
