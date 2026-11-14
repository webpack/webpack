"use strict";

/**
 * @returns {string} an SVG rect whose width is a fraction of 30000 zeros and a one
 */
const source = () =>
	`<svg xmlns="http://www.w3.org/2000/svg"><rect width=".${"0".repeat(30000)}1"/></svg>`;

module.exports = { source };
