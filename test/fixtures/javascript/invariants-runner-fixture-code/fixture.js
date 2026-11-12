"use strict";

let identifiers = 0;

/**
 * @returns {string} a license comment, a plain one, a string holding a lone surrogate and 40 calls, more than an excerpt holds
 */
const source = () => {
	let js = `/*! license */\n/* plain */\nvar s = "${String.fromCharCode(0xd800)}";\n`;
	for (let i = 0; i < 40; i++) js += `call(s, ${i});\n`;
	return js;
};

/**
 * @param {unknown} node the node the comment is attached to
 * @param {{ value: string }} comment the comment
 * @returns {boolean} whether the minifier keeps it
 */
const keepLicense = (node, comment) => comment.value.includes("license");

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the JavaScript parser's enums
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void }>} visitors counting identifiers, logging every 25th
 */
const countIdentifiers = (log, enums) => {
	identifiers = 0;
	return {
		[enums.NodeType.Identifier]: {
			enter: (path) => {
				identifiers++;
				if (identifiers % 25 === 0) log.push(`#${identifiers} ${path.name()}`);
			}
		}
	};
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ length: number, license: boolean, surrogate: boolean, identifiers: number }} what the print kept, and how many identifiers a visitor saw
 */
const check = (result) => ({
	length: result.code.length,
	license: result.code.includes("license"),
	surrogate: result.code.includes(String.fromCharCode(0xd800)),
	identifiers
});

/**
 * @param {string[]} values what a `parse.json` run answers
 * @returns {number[]} each value's length
 */
const lengths = (values) => values.map((value) => value.length);

module.exports = { source, keepLicense, countIdentifiers, check, lengths };
