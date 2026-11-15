"use strict";

let declarations = 0;

/**
 * @returns {string} a license comment, a plain one, a string holding a lone surrogate and 40 rules, more than an excerpt holds
 */
const source = () => {
	let css = `/*! license */\n/* plain */\n.u::after { content: "${String.fromCharCode(0xd800)}" }\n`;
	for (let i = 0; i < 40; i++) css += `.r${i} { color: red; margin: ${i}px }\n`;
	return css;
};

/**
 * @param {string} text a comment's text
 * @returns {boolean} whether the minifier keeps it
 */
const keepLicense = (text) => text.includes("license");

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the CSS parser's enums
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void }>} visitors counting declarations, logging every 25th
 */
const countDeclarations = (log, enums) => {
	declarations = 0;
	return {
		[enums.NodeType.Declaration]: {
			enter: (path) => {
				declarations++;
				if (declarations % 25 === 0) log.push(`#${declarations} ${path.name()}`);
			}
		}
	};
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ length: number, license: boolean, declarations: number }} what the print kept, and how many declarations a visitor saw
 */
const check = (result) => ({
	length: result.code.length,
	license: result.code.includes("license"),
	declarations
});

/**
 * @param {string[]} values what a `parse.json` run answers
 * @returns {number[]} each value's length
 */
const lengths = (values) => values.map((value) => value.length);

module.exports = { source, keepLicense, countDeclarations, check, lengths };
