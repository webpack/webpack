"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		uniqueName: "alone",
		// without `globalThis` the registry pulls in the global polyfill, which
		// would bring the require scope along and hide a missing one here
		environment: {
			globalThis: true
		}
	}
};
