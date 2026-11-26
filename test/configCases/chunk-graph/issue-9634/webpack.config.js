"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		b: "./entry-b",
		a: "./entry-a"
	},
	output: {
		filename: "[name].js"
	}
};
