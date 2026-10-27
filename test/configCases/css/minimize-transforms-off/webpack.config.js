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
				extractComments: false,
				// `false` here would drop every comment; `"all"` is the level that
				// makes none of them go, which is what leaves each label below.
				comments: "all",
				merge: false,
				remove: false,
				reorderDeclarations: false,
				shorten: {
					colors: false,
					functions: false,
					mediaQueries: false,
					numbers: false,
					quotes: false,
					selectors: false,
					values: false
				},
				target: { lowerUnsupported: false }
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
