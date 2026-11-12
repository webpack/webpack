"use strict";

/**
 * The SVG bodies offered.
 * @type {string[]}
 */
const svg = [];

/**
 * @param {string} source the body offered
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} the CSS without whitespace, the SVG with its `viewBox` renamed
 */
const renderSvg = (source, info) => {
	if (info.type === "css") return source.replace(/\s+/g, "");
	svg.push(source);
	return source.replace(" viewBox", " v");
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the SVG bodies offered, and the code
 */
const offeredSvg = (result) => {
	const asserted = [[...svg], result.code];
	svg.length = 0;
	return { asserted };
};

module.exports = {
	offeredSvg,
	renderSvg,
	svg
};
