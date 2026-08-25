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
				// `false` here would drop every comment; `"all"` is the level that
				// makes none of them go, which is what leaves each label below.
				comments: "all",
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
