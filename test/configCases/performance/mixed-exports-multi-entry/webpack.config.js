"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	optimization: {
		minimize: false
	},
	output: {
		filename: "[name].js",
		library: { type: "commonjs2" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
