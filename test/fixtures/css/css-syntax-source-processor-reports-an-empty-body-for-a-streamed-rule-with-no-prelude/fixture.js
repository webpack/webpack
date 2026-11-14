"use strict";

/**
 * @returns {string} a rule with no prelude whose 20000 empty declarations stream
 */
const source = () => `{${"a:;".repeat(20000)}}`;

module.exports = { source };
