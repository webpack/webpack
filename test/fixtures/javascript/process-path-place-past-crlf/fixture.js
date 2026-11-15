"use strict";

/**
 * @returns {string} lines ended by CRLF, which a file checked out under `text=auto` may not keep
 */
const source = () => "x;\r\ny();\r\n";

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the parser's enums
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void }>} a visitor logging where the call is, past a CRLF
 */
const callPlace = (log, enums) => ({
	[enums.NodeType.CallExpression]: {
		enter: (path) => {
			log.push(path.loc().join(","));
		}
	}
});

module.exports = { source, callPlace };
