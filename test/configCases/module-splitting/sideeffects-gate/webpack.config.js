"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	module: {
		// Declaring side effects opts the module out of splitting (Turbopack-like).
		rules: [{ test: /lib\.js$/, sideEffects: true }]
	},
	optimization: { minimize: true, sideEffects: true, concatenateModules: false }
};
