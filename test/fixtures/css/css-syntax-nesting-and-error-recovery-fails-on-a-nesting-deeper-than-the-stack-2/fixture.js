"use strict";

/**
 * @returns {string} a declaration nested deeper than any parse's stack
 */
const source = () => `a{b:${"(".repeat(100000)}}`;

module.exports = { source };
