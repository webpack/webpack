"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Reads `text-decoration` as CSS 2.1's line alone, so the shorthand is
	// written out as the line plus the longhands beside it.
	target: "browserslist: safari 15",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
