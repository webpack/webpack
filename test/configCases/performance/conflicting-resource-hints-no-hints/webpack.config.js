"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js" },
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	performance: {
		hints: false,
		conflictingResourceHints: true
	}
};
