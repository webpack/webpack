"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js" },
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	performance: {
		hints: false,
		conflictingResourceHints: true
	}
};
