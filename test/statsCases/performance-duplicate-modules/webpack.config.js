"use strict";

/** @type {import("../../../").Configuration} */
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
