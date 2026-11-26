"use strict";

/** @import { Configuration } from "../../../../" */

// A size hint, so it follows `hints` — unlike the configuration-mistake hints,
// which report regardless.
/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: false,
		redundantDynamicImports: true
	}
};
