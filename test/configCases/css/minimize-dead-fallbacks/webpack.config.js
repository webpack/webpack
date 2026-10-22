"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A selection that reads every color function below, so a declaration
	// standing before one is read by nothing.
	target: "browserslist: chrome 130, firefox 130, safari 18",
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
