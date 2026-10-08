"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// one entry per case, so each is minified as its own asset
	entry: {
		"minify-at-rule-seam-order": "./minify-at-rule-seam-order/index.js",
		"minify-legacy-box-prefixes": "./minify-legacy-box-prefixes/index.js"
	},
	target: "browserslist: chrome 120",
	mode: "production",
	output: {
		filename: "[name].js",
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
