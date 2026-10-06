"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A target that needs no flexbox prefix is what lets one be dropped.
	target: "browserslist: chrome 120",
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
