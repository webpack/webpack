"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// The same wiring as `minimize-vendor-prefixes` with prefixing turned off: the
	// target still resolves for all else it decides, and no prefix moves.
	target: "browserslist",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: {
				vendorPrefixes: false
			}
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
