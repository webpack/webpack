"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	performance: {
		hints: "error",
		cacheEffectiveness: true
	},
	module: {
		rules: [{ test: /[\\/]a\.js$/, use: require.resolve("./no-cache-loader") }]
	},
	stats: {
		all: false,
		hints: true,
		errors: true
	}
};
