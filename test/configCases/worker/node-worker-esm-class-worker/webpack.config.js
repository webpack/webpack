"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: "./index.js",
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		filename: "bundle.mjs"
	},
	experiments: {
		outputModule: true
	}
};
