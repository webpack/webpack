"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: {
		bundle0: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	experiments: {
		html: true,
		css: true
	}
};
