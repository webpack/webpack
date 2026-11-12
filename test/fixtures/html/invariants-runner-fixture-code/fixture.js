"use strict";

/** @type {string[]} */
let offers = [];
let elements = 0;

/**
 * @returns {string} a page of 30 styled paragraphs, more than an excerpt holds
 */
const source = () => {
	let html = "<!DOCTYPE html><title>t</title><style>b { color: red }</style>";
	for (let i = 0; i < 30; i++) {
		html += `<p style="margin: ${i}px">x${i}</p>`;
	}
	return html;
};

/**
 * @param {string} body an embedded body
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} the body without spaces for a style attribute, declined otherwise
 */
const minifyStyleAttributes = (body, info) => {
	offers.push(`${info.type}/${info.hostType}`);
	return info.as === undefined ? undefined : body.replace(/ /g, "");
};

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void }>} visitors counting elements, logging every tenth
 */
const countElements = (log, enums) => {
	elements = 0;
	return {
		[enums.NodeType.Element]: {
			enter: (path) => {
				elements++;
				if (elements % 10 === 0) log.push(`#${elements} ${path.name()}`);
			}
		}
	};
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ length: number, offers: Record<string, number>, elements: number }} the print's length, the renderer's offers by kind, and the elements a visitor saw
 */
const check = (result) => {
	/** @type {Record<string, number>} */
	const counts = {};
	for (const offer of offers) counts[offer] = (counts[offer] || 0) + 1;
	offers = [];
	return { length: result.code.length, offers: counts, elements };
};

/**
 * @param {string[]} values what a `parse.json` run answers
 * @returns {number[]} each value's length
 */
const lengths = (values) => values.map((value) => value.length);

module.exports = {
	source,
	minifyStyleAttributes,
	countElements,
	check,
	lengths
};
