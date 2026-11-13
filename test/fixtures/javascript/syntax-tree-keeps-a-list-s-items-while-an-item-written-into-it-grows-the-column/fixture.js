"use strict";

/**
 * @returns {string} a module of 40000 statements exporting one name
 */
const source = () => `var a, b;${"a;".repeat(40000)}export { a };`;

module.exports = { source };
