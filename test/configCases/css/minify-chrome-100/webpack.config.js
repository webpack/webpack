"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// one entry per case, so each is minified as its own asset
	entry: {
		"minify-hoisted-nested-join": "./minify-hoisted-nested-join/index.js",
		"minify-light-dark-idempotent": "./minify-light-dark-idempotent/index.js",
		"minify-light-dark-name-only": "./minify-light-dark-name-only/index.js",
		"minify-nested-combinator": "./minify-nested-combinator/index.js",
		"minify-nested-idempotent": "./minify-nested-idempotent/index.js"
	},
	// A target that reads no nesting is what hoists the nested rules out.
	target: "browserslist: chrome 100",
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
