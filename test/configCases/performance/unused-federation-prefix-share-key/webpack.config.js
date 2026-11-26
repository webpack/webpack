"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

// Whether a key is a prefix is decided by the config key, not by its
// `shareKey`: the modules carry the remainder appended to the share key.
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
				"pkg/": { shareKey: "shared", requiredVersion: false },
				"dead/": { shareKey: "gone", requiredVersion: false }
			}
		})
	]
};
