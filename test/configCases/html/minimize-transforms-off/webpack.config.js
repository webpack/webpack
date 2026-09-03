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
				// `false` here would drop every comment; `"all"` is the level that
				// makes none of them go.
				comments: "all",
				normalizeAttributeQuotes: false,
				normalizeEnumeratedAttributes: false,
				normalizeListAttributes: false,
				normalizeNumericAttributes: false,
				removeOptionalTags: false
			}
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
