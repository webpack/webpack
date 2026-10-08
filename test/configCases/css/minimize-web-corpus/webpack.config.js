"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// one entry per case, so each is minified as its own asset
	entry: {
		"minimize-dead-rules": "./minimize-dead-rules/index.js",
		"minimize-escaped-at-rule-names":
			"./minimize-escaped-at-rule-names/index.js",
		"minimize-gradient-position-validity":
			"./minimize-gradient-position-validity/index.js",
		"minimize-merge-rules-order": "./minimize-merge-rules-order/index.js"
	},
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	optimization: {
		minimize: { css: { extractComments: false } },
		// `"..."` keeps the default minimizer, which is what runs `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
