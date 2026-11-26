"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	experiments: {
		css: true
	},
	performance: {
		hints: "stats",
		maxAssetSize: 1000,
		maxEntrypointSize: 1000
	},
	stats: {
		all: false,
		hints: true
	}
};
