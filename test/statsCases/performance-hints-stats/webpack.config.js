"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	mode: "development",
	performance: {
		hints: "stats",
		unusedConfig: true
	},
	module: {
		rules: [{ test: /\.never-matches$/, type: "asset/source" }]
	},
	stats: {
		all: false,
		hints: true
	}
};
