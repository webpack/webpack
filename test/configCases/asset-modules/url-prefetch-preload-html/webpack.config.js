"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		html: true
	},
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/"
	},
	module: {
		// `<img src>` (and other URL-referenced HTML sources) get a
		// `<link rel="prefetch">` injected at chunk startup, same
		// machinery as `new URL(...)` in JS and `url(...)` in CSS.
		parser: {
			html: {
				urlHints: [{ test: /\.png$/, prefetch: true, fetchPriority: "low" }]
			}
		}
	}
};
