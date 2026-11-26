"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
