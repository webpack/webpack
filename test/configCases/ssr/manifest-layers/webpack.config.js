"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		one: { import: "./shared.js", layer: "one" },
		two: { import: "./shared.js", layer: "two" },
		main: "./index.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	experiments: {
		layers: true
	},
	plugins: [new SSRManifestPlugin()]
};
