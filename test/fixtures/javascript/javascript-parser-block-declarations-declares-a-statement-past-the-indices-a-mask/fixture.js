"use strict";

/**
 * @returns {string} two declarations with 40 statements between them
 */
const source = () => `const early = 1;\n${"void 0;\n".repeat(40)}const late = 2;`;

module.exports = { source };
