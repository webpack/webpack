"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	// A RegExp decides per request, so there is no entry that could be unused.
	externals: [/^path$/],
	externalsType: "commonjs"
};
