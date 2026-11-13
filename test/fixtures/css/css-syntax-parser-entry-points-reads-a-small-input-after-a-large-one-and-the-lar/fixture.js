"use strict";

/**
 * @returns {string} the input the test reads
 */
const source = () => "a{b:c}".repeat(39999) + "last{b:c}";

module.exports = { source };
