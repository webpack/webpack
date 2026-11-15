"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: {
		a: "./x.js",
		b: "./b.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		minimize: false
	}
};
