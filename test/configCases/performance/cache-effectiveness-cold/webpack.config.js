"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	// The dynamic import brings chunk-loading runtime modules, which are
	// generated rather than built and so are never reused from a cache
	performance: {
		hints: "warning",
		cacheEffectiveness: true
	}
};
