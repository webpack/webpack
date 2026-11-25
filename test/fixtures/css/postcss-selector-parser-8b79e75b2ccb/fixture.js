"use strict";

/**
 * @param {number=} n repetitions
 * @returns {string} the upstream selector in a stylesheet
 */
const source = (n) => "#{a}".repeat(n === undefined ? 2 : n) + "{color:red}";

module.exports = { source };
