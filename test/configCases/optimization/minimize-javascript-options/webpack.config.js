"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		// Replaces the default `javascript` minimizer options (`compress`
		// with two passes) — handed as-is to the JS minimizer.
		minimize: {
			javascript: {
				compress: false,
				mangle: false
			}
		},
		minimizer: ["..."]
	}
};
