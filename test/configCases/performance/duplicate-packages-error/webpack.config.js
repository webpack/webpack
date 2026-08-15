"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// the hint is reported as an error, so the bundle is only emitted (and its
	// assertions run) when emitting on errors stays on
	optimization: {
		emitOnErrors: true
	},
	performance: {
		hints: "error",
		duplicatePackages: true
	}
};
