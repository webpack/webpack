"use strict";

// A hint about the code being bundled, so it follows `hints` — unlike the
// configuration-mistake hints, which report regardless.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: false,
		circularDependencies: true
	}
};
