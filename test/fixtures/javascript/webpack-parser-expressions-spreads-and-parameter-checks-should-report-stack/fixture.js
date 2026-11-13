"use strict";

/**
 * @returns {string} parentheses nested deeper than any parse's stack
 */
const source = () => `${"(".repeat(100000)}x`;

module.exports = { source };
