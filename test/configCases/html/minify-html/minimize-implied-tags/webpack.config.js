"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { filename: "[name].js", pathinfo: false },
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false } },
		rules: [{ test: /\.html$/, type: "html" }]
	},
	optimization: {
		minimize: { html: { removeImpliedTags: true } },
		minimizer: ["..."]
	},
	experiments: { html: true }
};
