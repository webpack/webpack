"use strict";

/**
 * The comments the predicate was handed.
 * @type {unknown[]}
 */
const seen = [];

/**
 * @param {unknown} comment a comment
 * @returns {boolean} false, taking none out
 */
const record = (comment) => {
	seen.push(comment);
	return false;
};

/**
 * @returns {{ asserted: unknown[] }} the comments handed over
 */
const handed = () => {
	const asserted = [[...seen]];
	seen.length = 0;
	return { asserted };
};

module.exports = {
	handed,
	record,
	seen
};
