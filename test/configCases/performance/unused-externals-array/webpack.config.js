"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	// Strings nested in an array name a request each, unlike the RegExp beside them.
	externals: ["path", "never-imported", /^nothing-matches-this$/],
	externalsType: "commonjs"
};
