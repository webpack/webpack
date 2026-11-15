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
 * @param {string[]} log a walk's log
 * @param {string} entry one entry
 * @returns {string[]} the entries equal to it
 */
const only = (log, entry) => log.filter((e) => e === entry);

/**
 * @param {string[]} log a walk's log
 * @returns {unknown[]} the element each exit closes, then what is left open
 */
const balanced = (log) => {
	/** @type {unknown[]} */
	const out = [];
	/** @type {string[]} */
	const open = [];
	for (const entry of log) {
		if (entry.startsWith("+")) open.push(entry.slice(1));
		else out.push(open.pop());
	}
	out.push(open);
	return out;
};

/**
 * @returns {string} a paragraph of 40000 spans a `<div>` closes
 */
const source = () =>
	`<p>${"<span>x</span>".repeat(BIG)}<div>y</div>`;

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
 * @returns {{ asserted: unknown[] }} the spans entered, the last five visits, and the walk's balance
 */
const closed = (values) => {
	const log = linesOf(values);
	return { asserted: [only(log, "+span").length, log.slice(-5), ...balanced(log)] };
};

module.exports = {
	closed,
	source,
	walk
};
