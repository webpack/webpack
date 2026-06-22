"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "deno",
	// The harness picks the bundle extension from the raw config (before the
	// deno target's ESM default applies), so set ESM output explicitly.
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	}
};
