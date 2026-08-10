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
		// Only HTML stays minimized; its inline CSS still minifies, but with the
		// default options — a disabled `css` type carries none to forward.
		minimize: {
			javascript: false,
			css: false
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true,
		html: true
	}
};
