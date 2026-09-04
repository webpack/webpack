"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Chrome 100 reads `:is()` but no nesting, `:dir()` or `@custom-media`, so
	// every rewrite below has something to do. Exact versions keep it stable.
	target: "browserslist",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: ["..."],
		minimizeOptions: {
			css: {
				resolveCustomAtRules: true,
				rewriteDirSelector: true
			}
		}
	},
	experiments: {
		css: true
	}
};
