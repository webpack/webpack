"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/",
		resourceHints: {
			urlHints: [
				{
					test: { and: [/\.png$/, { not: /b\.png$/ }] },
					preload: true,
					as: "image"
				},
				{ include: { or: [/b\.png$/] }, prefetch: true },
				{ test: [{ not: /\.png$/ }], prefetch: true, fetchPriority: "low" },
				{ test: { glob: "*.woff2" }, preload: true, as: "font" }
			]
		}
	},
	module: {
		rules: [{ test: /\.(png|woff2)$/, type: "asset/resource" }]
	}
};
