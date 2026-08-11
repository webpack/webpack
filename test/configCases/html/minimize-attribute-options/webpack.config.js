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
		// Both default on; a consumer comparing raw attribute text turns them off.
		minimize: {
			html: {
				collapseBooleanAttributes: false,
				rewriteAttributeValues: false
			}
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
