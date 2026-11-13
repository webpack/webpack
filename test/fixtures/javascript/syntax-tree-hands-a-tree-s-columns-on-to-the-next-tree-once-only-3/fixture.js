"use strict";

/**
 * @returns {string} a script of 300000 statements, whose values a tree lets go of
 */
const source = () => "a;".repeat(300000);

module.exports = { source };
