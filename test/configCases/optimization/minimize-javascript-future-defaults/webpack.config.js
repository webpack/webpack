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
		// JavaScript minifies as it does without the future defaults.
		futureDefaults: true
	}
};
