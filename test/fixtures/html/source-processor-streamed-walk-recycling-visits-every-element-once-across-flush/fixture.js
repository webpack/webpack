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
 * @returns {string} 40000 paragraphs, each holding a `<b>`
 */
const source = () =>
	`<!DOCTYPE html><html><body>${"<p><b>x</b></p>".repeat(BIG)}</body></html>`;

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
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging `+tag` and `-tag`, skipping the root's children
 */
const skipRoot = (log, enums) => ({
	[enums.NodeType.Document]: {
		enter: (path) => {
			log.push("+doc");
			path.skipChildren();
		},
		exit: () => log.push("-doc")
	},
	[enums.NodeType.Element]: {
		enter: (path) => log.push(`+${path.name()}`),
		exit: (path) => log.push(`-${path.name()}`)
	}
});

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the entered `p`s, `b`s, and every enter
 */
const visitsEachOnce = (values) => {
	const log = linesOf(values);
	return { asserted: [only(log, "+p"), only(log, "+b"), log.filter((l) => l.startsWith("+"))] };
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the body's visits, four at a time
 */
const keepsParents = (values) => {
	const log = linesOf(values);
	const body = log.slice(log.indexOf("+body") + 1, log.lastIndexOf("-body"));
	const asserted = [];
	for (let i = 0; i < body.length; i += 4) asserted.push(body.slice(i, i + 4));
	return { asserted };
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the whole log
 */
const logged = (values) => {
	const log = linesOf(values);
	return { asserted: [log] };
};

module.exports = {
	keepsParents,
	logged,
	skipRoot,
	source,
	visitsEachOnce,
	walk
};
