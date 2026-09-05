"use strict";

const { ContainerReferencePlugin } = require("../../../../").container;

// The declared names and the exposed paths both hold slashes, so only the rule
// the plugin factorizes by tells one from the other.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: {
				abc: "ABC",
				"scope/def": "DEF",
				"never-imported": "NEVER_IMPORTED"
			}
		})
	]
};
