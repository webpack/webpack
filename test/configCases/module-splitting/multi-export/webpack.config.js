"use strict";

// Scenario modeled on Turbopack's tree-shaker multi-export / combined-export.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: true, concatenateModules: false }
};
