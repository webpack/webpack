"use strict";

/** @type {import("../../../").Configuration} */
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
