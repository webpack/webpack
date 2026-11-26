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
		// `"..."` keeps the default minimizer, which hands
		// `optimization.minimize.html` to `htmlMinify`.
		minimize: {
			html: {
				collapseWhitespace: true
			}
		},
		minimizer: ["..."]
	},
	experiments: {
		html: true
	}
};
