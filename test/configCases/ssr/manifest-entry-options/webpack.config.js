"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		shared: "./shared.js",
		app: { import: "./app.js", dependOn: "shared" },
		solo: { import: "./solo.js", runtime: "rt" },
		main: "./index.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	plugins: [new SSRManifestPlugin()]
};
