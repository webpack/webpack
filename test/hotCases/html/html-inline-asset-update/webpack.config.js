"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	entry: { main: "./index.js", page: "./page.html" },
	output: { filename: "[name].js" },
	node: { __dirname: false },
	experiments: {
		html: true
	}
};
