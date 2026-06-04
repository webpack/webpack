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
		publicPath: "https://example.com/public/",
		// Array form — `test` / `include` / `exclude` scope each rule.
		// Use the standard `ModuleFilenameHelpers` matcher, so the same
		// regex / string / function shapes work as for `module.rules`.
		resourceHints: [
			{
				test: /\.(png|webp|jpg)$/,
				prefetch: true,
				fetchPriority: "low"
			},
			{
				test: /\.woff2$/,
				preload: true,
				fetchPriority: "high"
			}
		]
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
