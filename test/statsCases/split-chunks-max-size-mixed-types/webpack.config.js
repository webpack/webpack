"use strict";

// Regression for the deterministicGrouping merge-target bug: when maxSize
// splitting hits the undersized edge case, problematic modules must merge into
// the result group sharing the most size types. The async "grp" chunk mixes
// asset, javascript and css size types so all three participate in grouping.
/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "[name].js"
	},
	experiments: {
		css: true
	},
	module: {
		rules: [{ test: /\.bin$/, type: "asset/resource" }]
	},
	optimization: {
		minimize: false,
		concatenateModules: false,
		splitChunks: {
			chunks: "all",
			minSize: { javascript: 70, asset: 40, css: 20 },
			maxSize: { javascript: 110, asset: 90, css: 80 },
			minSizeReduction: 0,
			minRemainingSize: 0,
			cacheGroups: { default: false, defaultVendors: false }
		}
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkModules: true,
		chunkRelations: true,
		entrypoints: true,
		modules: false
	}
};
