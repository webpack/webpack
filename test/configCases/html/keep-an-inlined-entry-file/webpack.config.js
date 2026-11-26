"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: {
		main: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "[name].js"
	},
	// The page's tag is refused, so the files are emitted despite the error.
	optimization: { emitOnErrors: true },
	experiments: {
		html: true
	}
};
