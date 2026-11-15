"use strict";

/**
 * @returns {string} an SVG rect whose width is a digit, 30000 spaces and a letter
 */
const source = () =>
	`<svg xmlns="http://www.w3.org/2000/svg"><rect width="1${" ".repeat(30000)}x"/></svg>`;

module.exports = { source };
