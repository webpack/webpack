"use strict";

// The names 5.110.0 shipped, which 'unusedConfig' replaced: they must keep
// enabling the check rather than failing schema validation.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	resolve: { alias: { "never-matched": false } },
	performance: {
		hints: "warning",
		unusedAliases: true,
		unusedRules: true
	}
};
