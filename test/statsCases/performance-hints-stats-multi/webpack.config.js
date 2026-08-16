"use strict";

/** @type {import("../../../").Configuration[]} */
module.exports = ["first", "second"].map((name) => ({
	name,
	entry: "./index",
	mode: "development",
	performance: {
		hints: "stats",
		unusedRules: true
	},
	module: {
		rules: [{ test: /\.never-matches$/, type: "asset/source" }]
	},
	stats: {
		all: false,
		hints: true
	}
}));
