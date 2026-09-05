"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
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
