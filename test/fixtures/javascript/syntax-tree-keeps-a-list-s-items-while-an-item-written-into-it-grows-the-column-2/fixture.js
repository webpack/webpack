"use strict";

/**
 * @returns {string} the same module exporting one name more
 */
const source = () => `var a, b;${"a;".repeat(40000)}export { a, b };`;

module.exports = { source };
