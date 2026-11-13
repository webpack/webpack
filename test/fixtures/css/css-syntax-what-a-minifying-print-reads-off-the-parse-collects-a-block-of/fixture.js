"use strict";

// Comfortably past the node count a block streams its children at.
const MANY = 3000;

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`a{${"margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px;".repeat(MANY)}}`;

module.exports = { source };
