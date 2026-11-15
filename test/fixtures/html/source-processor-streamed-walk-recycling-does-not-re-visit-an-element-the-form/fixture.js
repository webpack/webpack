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
 * @returns {string} a form holding 40000 paragraphs and a `<div>` its end tag leaves open
 */
const source = () =>
	`<!DOCTYPE html><html><body><form>${"<p>x</p>".repeat(BIG)}<div></form><p>y</p></div></body></html>`;

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
 * @returns {{ asserted: unknown[] }} the `div`'s enters and exits, and where the form exits
 */
const divOnce = (values) => {
	const log = linesOf(values);
	return { asserted: [only(log, "+div"), only(log, "-div"), log.indexOf("-form")] };
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} how often the `div` is entered, where the form exits, and the walk's balance
 */
const divBalanced = (values) => {
	const log = linesOf(values);
	return { asserted: [only(log, "+div").length, log.indexOf("-form"), ...balanced(log)] };
};

module.exports = {
	divBalanced,
	divOnce,
	source,
	walk
};
