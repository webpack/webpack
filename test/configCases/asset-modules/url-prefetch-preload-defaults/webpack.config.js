"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/"
	},
	module: {
		// Project-wide defaults for `new URL(..., import.meta.url)` — the JS
		// parser applies them to every URL without an explicit `webpackPrefetch` /
		// `webpackPreload` comment.
		parser: {
			javascript: {
				urlHints: [{ prefetch: true, fetchPriority: "low" }]
			}
		},
		rules: [
			{
				test: /\.(png|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
