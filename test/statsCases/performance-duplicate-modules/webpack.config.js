"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	performance: {
		hints: "stats",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	},
	stats: {
		all: false,
		hints: true
	}
};
