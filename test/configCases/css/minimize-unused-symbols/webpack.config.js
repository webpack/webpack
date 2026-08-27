"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		// The object form enables minimizing and configures the built-in minimizer.
		minimize: {
			css: {
				unusedSymbols: ["gone", "gone-in", "--gone"]
			}
		},
		// `"..."` keeps the default minimizer, which reads those options.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
