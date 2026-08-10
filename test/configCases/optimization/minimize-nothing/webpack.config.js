"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		// JS is the only type the build emits, and it is excluded — the built-in
		// minimizer has nothing left to claim and applies nothing.
		minimize: {
			javascript: false
		},
		minimizer: ["..."]
	}
};
