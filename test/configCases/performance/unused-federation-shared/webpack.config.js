"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
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
