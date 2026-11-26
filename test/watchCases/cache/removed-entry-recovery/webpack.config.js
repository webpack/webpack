"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		changing: "./changing.js"
	},
	output: {
		filename: "[name].js"
	}
};
