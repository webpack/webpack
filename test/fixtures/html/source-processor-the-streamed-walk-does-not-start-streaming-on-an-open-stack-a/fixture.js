"use strict";

/**
 * @param {string[]} values a `SourceProcessor` run's answer, its visit log
 * @returns {string[]} the log's lines
 */
const linesOf = (values) => (values[0] === "" ? [] : values[0].split("\n"));

/**
 * @returns {string} a form whose `<div>` holds 25000 texts and comments
 */
const source = () =>
	`<form><div>${"a<!---->".repeat(25000)}b</form>c`;

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
 * @returns {{ asserted: unknown[] }} the whole log
 */
const logged = (values) => {
	const log = linesOf(values);
	return { asserted: [log] };
};

module.exports = {
	logged,
	source,
	walk
};
