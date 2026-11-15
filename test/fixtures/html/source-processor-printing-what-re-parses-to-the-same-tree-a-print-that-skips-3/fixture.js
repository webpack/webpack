"use strict";

/** @type {{ log: string[] }} */
const visits = { log: [] };

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors skipping the root's children, logging its exit and each element
 */
const skipRoot = (log, enums) => {
	visits.log = log;
	return {
		[enums.NodeType.Document]: {
			enter: (path) => path.skipChildren(),
			exit: () => log.push("-doc")
		},
		[enums.NodeType.Element]: {
			enter: (path) => log.push(`+${path.name()}`),
			exit: (path) => log.push(`-${path.name()}`)
		}
	};
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the code
 */
const printedAndLog = (result) => ({ asserted: [result.code] });

module.exports = {
	printedAndLog,
	skipRoot
};
