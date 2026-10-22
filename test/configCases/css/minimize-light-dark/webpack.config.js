"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "browserslist",
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
