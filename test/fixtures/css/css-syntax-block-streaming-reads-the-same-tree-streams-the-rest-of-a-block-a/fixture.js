"use strict";

// Comfortably past the node count a block streams its children at.
const MANY = 3000;
const DECLS = "c:1 2 3 4;".repeat(MANY);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{b{${DECLS}}e{}d:1}`;

module.exports = { source };
