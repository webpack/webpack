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
				booleanAttributes: false,
				// `false` here would drop every comment; `"all"` is the level that
				// makes none of them go.
				comments: "all",
				enumeratedAttributes: false,
				listAttributes: false,
				minifyJson: false,
				minifyStyles: false,
				numericAttributes: false,
				optionalTags: false,
				quotes: false,
				urlAttributes: false
			}
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
