"use strict";

/**
 * @returns {string} an SVG drawing of 6000 nested groups, each tag on its own indented line
 */
const source = () =>
	`<svg xmlns="http://www.w3.org/2000/svg">\n${"<g> \n".repeat(6000)}${"</g>\n".repeat(6000)}</svg>`;

module.exports = { source };
