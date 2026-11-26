"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	// Keep the resolve log short, free of outside paths and the same on every Node.js
	experiments: { typescript: false },
	resolve: { descriptionFiles: [], extensions: [] },
	stats: {
		all: false,
		errors: true,
		errorDetails: true
	}
};
