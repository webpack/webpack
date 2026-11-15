"use strict";

/**
 * @returns {string} a script of 140000 statements, large enough for a tree to let go of
 */
const source = () => "a;".repeat(140000);

module.exports = { source };
