"use strict";

const deprecationTracking = require("./deprecationTracking");

/**
 * Registers hooks that fail the surrounding test when webpack emits an
 * unexpected deprecation during it. Use in suites that run real builds but
 * have no per-case `deprecations.js` convention.
 *
 * Deprecations whose code is listed in `allowed` are tolerated — webpack
 * memoizes its deprecated alias getters, so such a deprecation fires at most
 * once per process (on whichever test touches it first) and cannot be pinned
 * to a single case.
 * @param {(string | RegExp)[]=} allowed expected deprecation codes
 * @returns {void}
 */
module.exports = (allowed = []) => {
	/** @type {ReturnType<typeof deprecationTracking.start>} */
	let deprecationTracker;

	beforeEach(() => {
		deprecationTracker = deprecationTracking.start();
	});

	afterEach(() => {
		const deprecations = deprecationTracker().filter(
			({ code }) =>
				!allowed.some((a) => (a instanceof RegExp ? a.test(code) : a === code))
		);
		expect(deprecations).toEqual([]);
	});
};
