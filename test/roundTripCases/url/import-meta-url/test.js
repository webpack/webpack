"use strict";

// Re-bundling stacks the `/* asset import */` comment, so allow one or more.
const ANALYZABLE =
	/new URL\((?:\/\* asset import \*\/ )+"\.\/logo\.png", import\.meta\.url\)/;

/**
 * @param {import("../../../RoundTripTestCases.template").RoundTripStep[]} steps build steps (0 = initial, 1 = re-bundled)
 * @returns {void}
 */
module.exports = (steps) => {
	for (const step of steps) {
		expect(step.readText("bundle.mjs")).toMatch(ANALYZABLE);
		expect(step.readText("logo.png")).toBe("ROUND-TRIP-PNG");
	}
};
