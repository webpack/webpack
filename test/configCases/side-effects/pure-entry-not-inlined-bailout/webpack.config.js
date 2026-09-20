"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	optimization: {
		// Concatenation would pull the referencing module in and leave the entry
		// inlinable, which is the case that needs no report.
		concatenateModules: false
	},
	stats: { optimizationBailout: true },
	experiments: { outputModule: true }
};
