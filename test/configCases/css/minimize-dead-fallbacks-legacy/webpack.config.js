"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A selection that reads none of the color functions below, so each fallback
	// before one is still the only color those engines get.
	target: "browserslist: chrome 60, firefox 60, safari 11",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which resolves the target.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
