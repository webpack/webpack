"use strict";

const path = require("path");
const fs = require("graceful-fs");
const deprecationTracking = require("./deprecationTracking");

/**
 * Registers hooks that fail the surrounding test when webpack emits any
 * deprecation during it. Use in suites that run real builds but should never
 * emit a deprecation.
 * @returns {void}
 */
const expectNoDeprecations = () => {
	/** @type {ReturnType<typeof deprecationTracking.start>} */
	let deprecationTracker;

	beforeEach(() => {
		deprecationTracker = deprecationTracking.start();
	});

	afterEach(() => {
		expect(deprecationTracker()).toEqual([]);
	});
};

module.exports = expectNoDeprecations;

/**
 * Like `expectNoDeprecations`, but deprecations whose code matches an entry of
 * the running case's `deprecations.js` (same `[{ code: /RegExp/ }]` format used
 * by the *TestCases suites) are allowed. Listed deprecations may be emitted or
 * not — webpack memoizes its deprecated alias getters, so such a deprecation
 * fires at most once per process and cannot be pinned to a single case.
 * @param {() => string} getTestDirectory current case directory
 * @returns {void}
 */
module.exports.expectOnlyListedDeprecations = (getTestDirectory) => {
	/** @type {ReturnType<typeof deprecationTracking.start>} */
	let deprecationTracker;

	beforeEach(() => {
		deprecationTracker = deprecationTracking.start();
	});

	afterEach(() => {
		const file = path.join(getTestDirectory(), "deprecations.js");
		/** @type {{ code: RegExp }[]} */
		const allowed = fs.existsSync(file) ? require(file) : [];
		const unexpected = deprecationTracker().filter(
			({ code }) => !allowed.some((a) => a.code.test(code))
		);
		expect(unexpected).toEqual([]);
	});
};
