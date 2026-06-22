"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "deno",
	// `target: "deno"` defaults to ESM, but the test harness decides the bundle
	// extension from the raw config (before defaults), so make it explicit.
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	}
};
