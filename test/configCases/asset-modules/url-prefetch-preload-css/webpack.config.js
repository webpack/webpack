"use strict";

const rules = [
	{ test: /\.(png|webp|jpg)$/, prefetch: true, fetchPriority: "low" },
	{ test: /\.woff2$/, preload: true, fetchPriority: "high" }
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/"
	},
	module: {
		// Same `urlHints` set on both JS and CSS parsers — the JS `new URL(...)`
		// pipeline and the CSS `url(...)` pipeline each apply their own rules.
		parser: {
			javascript: { urlHints: rules },
			css: { urlHints: rules }
		},
		rules: [
			{
				test: /\.(png|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
