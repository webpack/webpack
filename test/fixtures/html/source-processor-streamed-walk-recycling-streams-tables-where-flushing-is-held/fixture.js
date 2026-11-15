"use strict";

const BIG_ROWS = 15000;

/**
 * @param {string[]} values a `SourceProcessor` run's answer, its visit log
 * @returns {string[]} the log's lines
 */
const linesOf = (values) => (values[0] === "" ? [] : values[0].split("\n"));

/**
 * @param {string[]} log a walk's log
 * @param {string} entry one entry
 * @returns {string[]} the entries equal to it
 */
const only = (log, entry) => log.filter((e) => e === entry);

/**
 * @returns {string} 15000 one-cell tables
 */
const source = () =>
	`<!DOCTYPE html><html><body>${"<table><tr><td>a</td></tr></table>".repeat(BIG_ROWS)}</body></html>`;

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
 * @returns {{ asserted: unknown[] }} the tables and cells entered
 */
const tables = (values) => {
	const log = linesOf(values);
	return { asserted: [only(log, "+table"), only(log, "+td")] };
};

module.exports = {
	source,
	tables,
	walk
};
