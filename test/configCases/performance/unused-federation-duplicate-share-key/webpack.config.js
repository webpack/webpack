"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

// Both keys carry the same `shareKey`, so neither may hide the other.
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
				lodash: { shareKey: "lodash", requiredVersion: false },
				"lodash-es": { shareKey: "lodash", requiredVersion: false }
			}
		})
	]
};
