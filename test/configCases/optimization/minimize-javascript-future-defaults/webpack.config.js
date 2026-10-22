"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	optimization: {
		// The harness turns minimizing off unless a case asks for webpack's own.
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		// Minifies through webpack's printer rather than terser as published.
		futureDefaults: true
	}
};
