"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: {
		main: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "[name].js"
	},
	experiments: {
		html: true
	}
};
