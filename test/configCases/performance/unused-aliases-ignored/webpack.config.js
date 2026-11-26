"use strict";

/** @import { Configuration } from "../../../../" */

// `false` is what the request resolves to, so it never reaches a module
// carrying the request as written — the alias applied all the same.
/** @type {Configuration} */
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
