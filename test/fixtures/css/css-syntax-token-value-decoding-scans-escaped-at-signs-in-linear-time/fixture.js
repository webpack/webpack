"use strict";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.a{color:red}${"\\@".repeat(500)}`;

module.exports = { source };
