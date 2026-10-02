"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A target that reads no nesting is what hoists the nested rules out.
	target: "browserslist: chrome 100",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: { css: { extractComments: false } },
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
