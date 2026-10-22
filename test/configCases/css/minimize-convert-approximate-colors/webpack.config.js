"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A target every browser of is one the data states, so the color rewrites apply.
	target: "browserslist:chrome 140, firefox 140, safari 26.2",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: { extractComments: false, convertApproximateColors: true }
		},
		// `"..."` keeps the default minimizer, which is what reads
		// `optimization.minimize.css` and hands it to `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
