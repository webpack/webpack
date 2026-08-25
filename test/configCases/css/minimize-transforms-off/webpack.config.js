"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: {
				colors: false,
				escapes: false,
				functions: false,
				lowercase: false,
				mediaQueries: false,
				numbers: false,
				quotes: false,
				rules: false,
				selectors: false,
				shorthands: false
			}
		},
		// `"..."` keeps the default minimizer, which is what reads
		// `optimization.minimize.css` and hands it to `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
