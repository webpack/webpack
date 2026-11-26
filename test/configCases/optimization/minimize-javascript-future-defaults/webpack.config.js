"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	optimization: {
		// The harness turns minimizing off unless a case asks for webpack's own.
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		// Minifies through webpack's printer, as without `futureDefaults`.
		futureDefaults: true
	}
};
