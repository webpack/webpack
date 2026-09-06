"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

// Both entries carry a `shareKey` other than their config key: the used one must
// still count, and the unused one must be named as the config spells it.
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
				"used-lib": {
					shareKey: "used-under-another-name",
					requiredVersion: false
				},
				"unused-alias": {
					import: false,
					shareKey: "unused-under-another-name",
					requiredVersion: false
				}
			}
		})
	]
};
