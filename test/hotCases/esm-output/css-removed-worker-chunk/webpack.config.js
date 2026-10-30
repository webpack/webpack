"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: path.resolve(__dirname, "../../css/removed-worker-chunk"),
	experiments: { css: true },
	output: {
		publicPath: "auto",
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	}
};
