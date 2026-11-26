"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	target: "node",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	optimization: { minimize: false, splitChunks: { chunks: "all", minSize: 0 } }
};
