"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: {
		bundle0: "./index.js",
		"shift-jis": "./shift-jis.html",
		"utf-16": "./utf-16.html"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: false
	},
	experiments: { html: true }
};
