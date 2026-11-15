"use strict";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.a{color:red}${"\\@".repeat(2000)}`;

module.exports = { source };
