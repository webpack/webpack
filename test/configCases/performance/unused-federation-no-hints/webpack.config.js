"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {import("../../../../").Configuration} */
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
