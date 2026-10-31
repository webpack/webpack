"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	experiments: { css: true },
	context: path.resolve(__dirname, "../../css/removed-chunk"),
	output: {
		publicPath: "auto",
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	}
};
