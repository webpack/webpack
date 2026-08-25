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
				// The level csso spells `false` and cssnano `removeAll`: nothing
				// survives but the source-map pragma and what `preserveComments` names.
				comments: "all",
				preserveComments: ["^\\s*keep:", /build-step/]
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
