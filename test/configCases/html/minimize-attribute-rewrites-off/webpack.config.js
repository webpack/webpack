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
		minimize: {
			html: {
				collapseBooleanAttributes: false,
				normalizeAttributeValues: false,
				minifyStyleAttribute: false,
				removeAttributeQuotes: false
			}
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
