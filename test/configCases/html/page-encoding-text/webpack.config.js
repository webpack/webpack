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
		html: { csp: true }
	},
	node: { __dirname: false },
	optimization: {
		minimize: false
	},
	experiments: { css: true, html: true }
};
