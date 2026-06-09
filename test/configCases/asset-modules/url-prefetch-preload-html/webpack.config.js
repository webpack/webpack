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
		publicPath: "https://example.com/public/",
		// Project-wide default — `<img src>` (and other URL-referenced
		// assets in HTML) get a `<link rel="prefetch">` injected at
		// chunk startup, same machinery as `new URL(...)` in JS and
		// `url(...)` in CSS.
		resourceHints: [{ test: /\.png$/, prefetch: true, fetchPriority: "low" }]
	}
};
