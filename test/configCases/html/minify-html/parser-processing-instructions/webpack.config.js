"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		},
		parser: {
			html: {
				sources: false
			}
		}
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which re-serializes the page from
		// the parsed tree — the only place the tree is observable.
		minimizer: ["..."]
	},
	experiments: {
		html: true
	}
};
