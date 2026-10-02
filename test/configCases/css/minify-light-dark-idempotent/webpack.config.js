"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A target that reads no `light-dark()` is what turns the lowering on.
	target: "browserslist: chrome 100",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: { css: { extractComments: false } },
		// `"..."` keeps the default minimizer, which resolves the target.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
