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
				// One option says which comments survive: this pattern stands in for
				// the banner rule, so a `/*!` banner it does not name goes with the
				// rest — which is what terser's `format.comments` does.
				comments: /keep:/
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
