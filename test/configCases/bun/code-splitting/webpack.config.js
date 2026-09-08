"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "bun",
	// The harness picks the bundle extension from the raw config (before the
	// bun target's ESM default applies), so set ESM output explicitly.
	output: {
		module: true
	},
	optimization: {
		chunkIds: "named"
	}
};
