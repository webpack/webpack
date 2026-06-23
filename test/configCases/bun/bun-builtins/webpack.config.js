"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "bun",
	// `target: "bun"` defaults to ESM, but the test harness decides the bundle
	// extension from the raw config (before defaults), so make it explicit.
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	}
};
