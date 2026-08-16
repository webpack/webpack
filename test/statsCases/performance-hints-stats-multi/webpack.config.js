"use strict";

/**
 * Both compilers report a hint, so the aggregated stats must carry each one
 * tagged with the compiler it came from.
 * @type {import("../../../").Configuration[]}
 */
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
