"use strict";

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
		// Opt into the `@font-face` preload heuristic for CSS.
		parser: {
			css: { fontPreload: true }
		},
		rules: [
			{
				test: /\.(woff2?|png)$/,
				type: "asset/resource"
			}
		]
	}
};
