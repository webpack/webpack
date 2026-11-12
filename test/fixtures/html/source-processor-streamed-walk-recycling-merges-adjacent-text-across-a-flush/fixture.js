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
 * @returns {string} 40000 paragraphs, then one holding 2000 character references
 */
const source = () =>
	`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(BIG)}<p id="tail">${"a&amp;b".repeat(2000)}</p></body></html>`;

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging each text's value
 */
const texts = (log, enums) => ({
	[enums.NodeType.Text]: (path) => log.push(path.value())
});

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} every text visited, and the last one
 */
const merged = (values) => {
	const log = linesOf(values);
	return { asserted: [log, log[log.length - 1]] };
};

module.exports = {
	merged,
	source,
	texts
};
