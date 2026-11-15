"use strict";

/**
 * @returns {string} blocks nested deeper than any parse's stack
 */
const source = () => "{".repeat(100000);

module.exports = { source };
