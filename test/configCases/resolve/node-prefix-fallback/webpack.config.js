"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Use web target so node: built-ins are NOT auto-externalized.
	// This is the primary use case: browser builds that need to polyfill node modules.
	target: "web",
	resolve: {
		// "node:crypto" → stripped to "crypto" → fallback applies
		fallback: {
			crypto: path.resolve(__dirname, "polyfill.js")
		},
		// "node:fs" → stripped to "fs" → alias applies
		alias: {
			fs: path.resolve(__dirname, "polyfill.js")
		}
	}
};
