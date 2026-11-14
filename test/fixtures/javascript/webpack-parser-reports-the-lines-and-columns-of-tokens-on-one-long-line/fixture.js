"use strict";

/**
 * @returns {string} 2000 statements and a comment on a single line
 */
const source = () => `${"a;".repeat(2000)}/* end */`;

module.exports = { source };
