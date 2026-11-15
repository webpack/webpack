"use strict";

/**
 * @returns {string} the input the test reads
 */
const source = () => `<r>${'<a b="1" c="2"/>'.repeat(31000)}</r>`;

module.exports = { source };
