"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: "./index.js",
		page: "./page.html",
		other: "./other.html"
	},
	output: { filename: "[name].js", htmlFilename: "[name].html" },
	// Emitted anyway, so the test reads what the entry would have held.
	optimization: { emitOnErrors: true },
	experiments: { html: true }
};
