"use strict";

// Coverage instrumentation slows every build, and a case that first loads a
// large file of `lib` also pays for instrumenting it, so a coverage run gets
// more time. jest.config.js sets the flag before Jest starts its workers.
const FACTOR = process.env.WEBPACK_TEST_COVERAGE ? 3 : 1;

/**
 * @param {number} ms timeout of a regular run
 * @returns {number} timeout of this run
 */
module.exports = (ms) => ms * FACTOR;
