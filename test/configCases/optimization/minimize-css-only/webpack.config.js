"use strict";

/** @type {import("../../../../").Configuration} */
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
		// `false` excludes a type from the built-in minimizer: only the CSS
		// asset is minimized here.
		minimize: {
			javascript: false,
			html: false
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
