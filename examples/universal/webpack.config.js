"use strict";

const path = require("node:path");

/** @type {import("../../").Configuration} */
const config = {
	// The universal target: one compiler emits a single bundle that runs in the
	// browser, web workers, Node.js, Electron and NW.js. Output is always ESM, so
	// `experiments.outputModule` and `output.module` default to `true` here.
	target: "universal",
	entry: "./example.js",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.mjs",
		chunkFilename: "[name].mjs"
	},
	optimization: {
		// Keep the async chunk filename stable across the example's three builds.
		chunkIds: "named"
	}
};

module.exports = config;
