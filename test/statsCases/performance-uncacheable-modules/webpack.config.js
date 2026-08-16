"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	performance: {
		hints: "stats",
		uncacheableModules: true
	},
	module: {
		rules: [
			{ test: /[\\/](?:a|b)\.js$/, use: require.resolve("./no-cache-loader") }
		]
	},
	stats: {
		all: false,
		hints: true
	}
};
