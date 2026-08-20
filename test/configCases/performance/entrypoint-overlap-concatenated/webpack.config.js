"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		entrypointOverlap: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		splitChunks: false
	}
};
