"use strict";

// `unusedConfig` wins, so the alias below goes unreported — but writing the
// deprecated name still has to say so.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	resolve: { alias: { "never-matched": false } },
	performance: {
		hints: "warning",
		unusedAliases: true,
		unusedConfig: false
	}
};
