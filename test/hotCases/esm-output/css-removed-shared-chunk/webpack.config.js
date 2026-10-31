"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js", third: "./third.js" },
	experiments: { css: true },
	output: {
		publicPath: "auto",
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	}
};
