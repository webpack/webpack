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
				collapseWhitespace: "smart",
				comments: "@license",
				minifyConditionalComments: true
			}
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
