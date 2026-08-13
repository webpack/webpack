"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// The same wiring as `minimize-vendor-prefixes`, with the option that turns
	// prefixing off — the browserslist target is still resolved for everything
	// else it decides, and no prefix is added or dropped.
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
