"use strict";

// Scenario modeled on Turbopack's namespace (import *) handling.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: true, concatenateModules: false }
};
