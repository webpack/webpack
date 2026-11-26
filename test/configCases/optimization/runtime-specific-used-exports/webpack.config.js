"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	},
	entry: {
		a: "./a",
		b: "./b",
		c: "./c"
	}
};
