"use strict";

/**
 * @returns {string} a second block that streams too
 */
const source = () => `ul { ${"gap : 1px ; ".repeat(12000)}}`;

module.exports = { source };
