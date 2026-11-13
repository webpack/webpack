"use strict";

/**
 * @returns {string} a function name one code unit longer than `url` escaped in full
 */
const source = () => `u${"r".repeat(27)}(a)`;

module.exports = { source };
