"use strict";

// A page imported from JavaScript has no entry name either, so the script it
// carries is named after the page's file.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { app: "./index.js" },
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true }
};
