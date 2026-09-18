"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `web` names no browsers, so nothing states what the output is read by and
	// the drop below is the option's alone.
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: {
				dropOverriddenDeclarations: true
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
