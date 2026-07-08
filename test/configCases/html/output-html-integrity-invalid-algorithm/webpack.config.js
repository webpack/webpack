"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: "./src/main.js" },
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: "index.html",
		crossOriginLoading: "anonymous",
		// An unsupported algorithm must surface as a webpack error, not crash
		// the compilation out of `processAssets`.
		html: { integrity: ["not-a-real-algorithm"] }
	},
	experiments: { html: true }
};
