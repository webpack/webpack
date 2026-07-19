"use strict";

const path = require("path");

// `data-themed` is registered as an extra source via `parser.html.sources`, so
// its URL is resolved like a normal reference; a `module.rules` loader keyed to
// that resource then transforms it, showing developers can attach their own
// loader to a resource referenced by a specific HTML tag/attribute.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: {
			html: {
				sources: ["...", { tag: "img", attribute: "data-themed", type: "src" }]
			}
		},
		rules: [
			{
				test: /themed\.svg$/,
				use: [path.resolve(__dirname, "svg-theme-loader.js")]
			}
		]
	},
	experiments: {
		html: true
	}
};
