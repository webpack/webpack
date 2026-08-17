"use strict";

// A size hint, so it follows `hints` — unlike the configuration-mistake hints,
// which report regardless.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: false,
		unsplitDynamicImports: true
	}
};
