"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		bundle0: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		// the test entry stays a file, only the page's script is inlined
		html: { inline: [/^page/] }
	},
	node: { __dirname: false },
	optimization: {
		minimize: false
	},
	experiments: { html: true }
};
