"use strict";

const { recordVisitors, repeat, shortCode } = require("../_shared/record");

const EMPTY = repeat(6000, (i) => `.e${i}{}`);
const PIECES = { EMPTY };

/**
 * @returns {string} a stylesheet holding a run long enough to stream
 */
const source = () => `@media a{${EMPTY}}`;

// The first at-rule's block: how many rules it collected, or none.
const firstAtRule = recordVisitors(({ NodeType, Field, Part }) => {
	let seen = false;
	return {
		[NodeType.AtRule]: (path) => {
			if (seen) return;
			seen = true;
			return path.rangeOf(Part.block) === null
				? null
				: path.fieldCount(Field.rules);
		}
	};
});


module.exports = { PIECES, short: shortCode(PIECES), source, firstAtRule };
