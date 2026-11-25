"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	entry: "./index.js",
	output: {
		filename: "bundle.mjs",
		chunkFilename: "[name].mjs",
		library: { type: "module" }
	}
};
