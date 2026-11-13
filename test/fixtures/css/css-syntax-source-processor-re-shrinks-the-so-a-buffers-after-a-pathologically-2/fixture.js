"use strict";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{b:${"x ".repeat(70000)}}`;

module.exports = { source };
