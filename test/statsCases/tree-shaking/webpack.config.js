"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		concatenateModules: false
	},
	stats: {
		chunkModules: false,
		modules: true,
		providedExports: true,
		usedExports: true
	}
};
