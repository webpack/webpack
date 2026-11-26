"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		broken: "./missing.js"
	},
	output: {
		filename: "[name].js"
	}
};
