"use strict";

/**
 * @returns {string} the input the test reads
 */
const source = () => "a{b:c}".repeat(30000);

module.exports = { source };
