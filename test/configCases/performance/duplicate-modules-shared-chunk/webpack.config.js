"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		duplicateModules: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				shared: { test: /shared\.js$/, name: "shared", enforce: true }
			}
		}
	}
};
