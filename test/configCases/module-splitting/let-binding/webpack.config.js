"use strict";

// Scenario modeled on Turbopack's tree-shaker let/live-binding cases.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: true, concatenateModules: false }
};
