"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "node",
	output: {
		strictModuleErrorHandling: true
	},
	experiments: {
		topLevelAwait: true
	}
};
