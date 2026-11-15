"use strict";

const value = "x ".repeat(40000).trim();

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{b:${value}}`;

module.exports = { source };
