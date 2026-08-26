"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { filename: "[name].js", pathinfo: false },
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false } }
	},
	optimization: {
		// The CSS minifier is off, so the CSS inside the html is off with it.
		minimize: { css: false },
		minimizer: ["..."]
	},
	experiments: { css: true, html: true }
};
