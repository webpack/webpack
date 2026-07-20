"use strict";

// `output.urlHints` (top-level shorthand) is fanned out as the base `urlHints`
// of every parser, so one list covers both JS `new URL(...)` and CSS `url(...)`.
// A `parser.css.urlHints` rule, matched later, still overrides it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/",
		// One project-wide list — applies to JS and CSS URL references alike.
		urlHints: [
			{ test: /\.woff2$/, preload: true, as: "font" },
			{ test: /\.png$/, prefetch: true, fetchPriority: "low" }
		]
	},
	module: {
		parser: {
			// Overrides the output-level png rule for JS `new URL(...)` only.
			javascript: {
				urlHints: [{ test: /icon\.png$/, preload: true, as: "image" }]
			}
		},
		rules: [{ test: /\.(png|woff2)$/, type: "asset/resource" }]
	}
};
