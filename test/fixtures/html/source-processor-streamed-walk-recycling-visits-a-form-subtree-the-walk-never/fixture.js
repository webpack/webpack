"use strict";

// Past the streaming threshold (49152 nodes), so the walk enters open
// elements, flushes under them and recycles node ids.
const BIG = 40000;

/**
 * @param {string[]} values a `SourceProcessor` run's answer, its visit log
 * @returns {string[]} the log's lines
 */
const linesOf = (values) => (values[0] === "" ? [] : values[0].split("\n"));

/**
 * @returns {string} 40000 paragraphs, then a form whose end tag leaves a `<div>` open
 */
const source = () =>
	`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(BIG)}<form><div></form><p>y</p></div></body></html>`;

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging `+tag` and `-tag`
 */
const walk = (log, enums) => ({
	[enums.NodeType.Element]: {
		enter: (path) => {
			log.push(`+${path.name()}`);
		},
		exit: (path) => log.push(`-${path.name()}`)
	}
});

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the log from the form on
 */
const fromForm = (values) => {
	const log = linesOf(values);
	return { asserted: [log.slice(log.indexOf("+form"))] };
};

module.exports = {
	fromForm,
	source,
	walk
};
