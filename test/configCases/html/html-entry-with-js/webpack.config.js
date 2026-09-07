"use strict";

// An entry that bundles JavaScript of its own next to an `.html` file: the
// entry's filename stays with that bundle, so the page's script keeps its own.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		page: ["./index.js", "./page.html"]
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
