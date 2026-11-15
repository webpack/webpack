"use strict";

/**
 * @returns {string} an outer `<div>` of 40000 paragraphs, past the streaming threshold
 */
const source = () =>
	`<div id=outer>${"<p><b>x</b></p>".repeat(40000)}</div>`;

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging the outer `<div>`'s end at its first enter and exit
 */
const ends = (log, enums) => {
	let entered = false;
	let exited = false;
	return {
		[enums.NodeType.Element]: {
			enter: (path) => {
				if (path.name() === "div" && !entered) {
					entered = true;
					log.push(`enter ${path.range()[1]}`);
				}
			},
			exit: (path) => {
				if (path.name() === "div" && !exited) {
					exited = true;
					log.push(`exit ${path.range()[1]}`);
				}
			}
		}
	};
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the outer `<div>`'s end at enter and at exit
 */
const endsAtBoth = (values) => {
	const ends = values[0].split("\n").map((line) => Number(line.split(" ")[1]));
	return { asserted: ends };
};

module.exports = {
	ends,
	endsAtBoth,
	source
};
