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
				// `false` here would drop every comment; `"all"` is the level that
				// makes none of them go, which is what leaves each label below.
				comments: "all",
				lowerUnsupported: false,
				mergeLonghands: false,
				mergeRules: false,
				normalizeQuotes: false,
				reduceFunctions: false,
				removeDeadRules: false,
				shortenColors: false,
				shortenMediaQueries: false,
				shortenNumbers: false,
				shortenSelectors: false,
				shortenValues: false
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
