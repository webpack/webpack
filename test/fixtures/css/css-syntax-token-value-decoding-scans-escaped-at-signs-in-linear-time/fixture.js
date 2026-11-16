"use strict";

/**
 * @param {number=} n how many escaped at-signs, the snapshots' own where absent
 * @returns {string} the stylesheet the test reads
 */
const source = (n) => `.a{color:red}${"\\@".repeat(n === undefined ? 500 : n)}`;

module.exports = { source };
