"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/",
		// Project-wide defaults — apply to every `new URL(..., import.meta.url)`
		// without an explicit `webpackPrefetch` / `webpackPreload` comment.
		// Lives on `output` (not on the JS parser) so the same defaults can
		// later also be honored by CSS / HTML URL references.
		resourceHints: {
			assets: {
				prefetch: true,
				fetchPriority: "low"
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.(png|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
