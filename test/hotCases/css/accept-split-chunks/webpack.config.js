"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		filename: "[name].js"
	},
	experiments: {
		css: true
	},
	optimization: {
		sideEffects: true,
		// Keep the barrel module in the graph so its HMR accept handler is codegen'd
		// while lazy re-exports of unused targets stay unresolved.
		innerGraph: false,
		usedExports: false,
		providedExports: false,
		splitChunks: {
			chunks: "all",
			minSize: 1,
			maxSize: 20000
		},
		runtimeChunk: "single"
	}
};
