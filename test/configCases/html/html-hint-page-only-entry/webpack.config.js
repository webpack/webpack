"use strict";

// A resource hint naming an HTML entry that emits nothing but its markup: the
// page has no JavaScript file, so no `<link>` is rendered for it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false
	},
	entry: {
		app: "./app.html",
		empty: "./empty.html",
		second: "./second.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		htmlFilename: "[name].html",
		resourceHints: [
			{ rel: "preload", entry: "empty" },
			{ rel: "preload", entry: "second" }
		]
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
