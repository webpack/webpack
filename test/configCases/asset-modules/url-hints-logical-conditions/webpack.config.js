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
				{ test: [{ not: /\.png$/ }], prefetch: true },
				{ include: { or: [/b\.png$/] }, prefetch: true }
			]
		}
	},
	module: {
		rules: [{ test: /\.(png|woff2)$/, type: "asset/resource" }]
	}
};
