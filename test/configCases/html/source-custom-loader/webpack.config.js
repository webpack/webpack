"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/**
 * `data-themed` is registered as an extra source via `parser.html.sources`, so
 * its URL resolves like a normal reference. A `module.rules` loader keyed to
 * that resource then transforms it, so a loader can be attached to a resource
 * referenced by a specific HTML tag and attribute.
 * @type {Configuration}
 */
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
