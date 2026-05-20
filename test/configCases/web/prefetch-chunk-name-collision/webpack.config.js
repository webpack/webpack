"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		a: "./a.js",
		b: "./b.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
