"use strict";

/**
 * @returns {string} an SVG drawing of 6000 nested groups around one metadata element
 */
const source = () =>
	`<svg xmlns="http://www.w3.org/2000/svg">${"<g>".repeat(6000)}<metadata>data</metadata>${"</g>".repeat(6000)}</svg>`;

module.exports = { source };
