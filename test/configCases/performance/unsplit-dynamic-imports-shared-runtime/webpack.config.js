"use strict";

// One runtime chunk for both entries, so a shared runtime name says nothing
// about which initial chunks `b` actually loads.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./entry-a",
		b: "./entry-b"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	},
	performance: {
		hints: "stats",
		unsplitDynamicImports: true
	}
};
