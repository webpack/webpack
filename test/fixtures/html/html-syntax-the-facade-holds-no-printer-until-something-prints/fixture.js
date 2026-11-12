"use strict";

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging the root's enter, which skips its children, and exit, and each element
 */
const rootOnly = (log, enums) => ({
	[enums.NodeType.Document]: {
		enter: (path) => {
			log.push("enter");
			path.skipChildren();
		},
		exit: () => log.push("exit")
	},
	[enums.NodeType.Element]: (path) => log.push(path.name())
});

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the whole log
 */
const logged = (values) => ({ asserted: [values[0] === "" ? [] : values[0].split("\n")] });

module.exports = {
	logged,
	rootOnly
};
