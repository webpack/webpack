"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Chrome 50 predates every CSS ability, so the selection alone holds each
	// spelling back — through the default minimizer, so the whole flow is driven.
	target: "browserslist: chrome 50",
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
