"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: false,
		unusedConfig: true
	},
	plugins: [
		new ConsumeSharedPlugin({
			consumes: {
				"used-lib": { requiredVersion: false },
				"unused-lib": { requiredVersion: false }
			}
		})
	]
};
