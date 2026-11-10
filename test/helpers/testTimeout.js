"use strict";

// Coverage instrumentation slows every build, and a case that first loads a
// large file of `lib` also pays for instrumenting it, so a coverage run gets
// more time. jest.config.js sets the global for a coverage run.
// `global`, not `globalThis`, which Node.js 10 does not have
const FACTOR = /** @type {{ __WEBPACK_TEST_COVERAGE__?: boolean }} */ (
	/** @type {unknown} */ (global)
).__WEBPACK_TEST_COVERAGE__
	? 3
	: 1;

/**
 * @param {number} ms timeout of a regular run
 * @returns {number} timeout of this run
 */
module.exports = (ms) => ms * FACTOR;
