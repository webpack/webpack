"use strict";

// `false` is what the request resolves to, so it never reaches a module
// carrying the request as written — the alias applied all the same.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	resolve: {
		alias: {
			"stub-me": false
		}
	}
};
