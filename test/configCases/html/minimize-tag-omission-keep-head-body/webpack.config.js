"use strict";

/** @type {import("../../../../").Configuration} */
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
		minimize: { html: { tagOmission: "keep-head-and-body" } },
		minimizer: ["..."]
	},
	experiments: { html: true }
};
