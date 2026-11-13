"use strict";

// Comfortably past the node count a block streams its children at.
const MANY = 3000;

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{${"b c{}".repeat(MANY * 2)}d:1}`;

module.exports = { source };
