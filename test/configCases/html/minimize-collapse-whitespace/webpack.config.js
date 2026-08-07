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
		minimize: {
			html: {
				collapseWhitespace: true
			}
		},
		// `"..."` keeps the default minimizer, which is what forwards
		// `optimization.minimize.html` to `htmlMinify`.
		minimizer: ["..."]
	},
	experiments: {
		html: true
	}
};
