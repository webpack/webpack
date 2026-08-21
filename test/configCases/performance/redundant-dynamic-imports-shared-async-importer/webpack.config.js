"use strict";

// `mid` is one async chunk both entries reach. Only `b` carries the target up
// front, so the `import()` still defers for `a` and must not be reported.
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
