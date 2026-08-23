"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: { import: "./index.js", library: { type: "commonjs2" } }
	},
	optimization: {
		minimize: false
	},
	output: {
		filename: "[name].js"
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
