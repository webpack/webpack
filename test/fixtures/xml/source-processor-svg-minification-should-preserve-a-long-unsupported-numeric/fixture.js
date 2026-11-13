"use strict";

/**
 * @returns {string} an SVG rect whose width is 30000 nines and an exponent with no digits
 */
const source = () =>
	`<svg xmlns="http://www.w3.org/2000/svg"><rect width="${"9".repeat(30000)}e"/></svg>`;

module.exports = { source };
