"use strict";

// `mid` runs in both entries. Only `a` carries the target up front, so the
// `import()` still defers for `b` and must not be reported.
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
		splitChunks: false
	},
	performance: {
		hints: "stats",
		redundantDynamicImports: true
	}
};
