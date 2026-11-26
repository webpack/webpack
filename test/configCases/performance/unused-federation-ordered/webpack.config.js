"use strict";

const { ContainerReferencePlugin } = require("../../../../").container;
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
				"zzz-unused": { requiredVersion: false },
				"aaa-unused": { requiredVersion: false }
			}
		}),
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: { "never-imported": "NEVER_IMPORTED" }
		})
	]
};
