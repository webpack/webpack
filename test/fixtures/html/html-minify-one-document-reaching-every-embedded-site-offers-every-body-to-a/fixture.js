"use strict";

/**
 * What each offer asked for, as `type` or `type/as`.
 * @type {string[]}
 */
const offered = [];

/**
 * @param {string} source the body offered
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} a marker naming what was asked for
 */
const answerAll = (source, info) => {
	const name = info.as === undefined ? info.type : `${info.type}/${info.as}`;
	offered.push(name);
	return `ANSWER(${name})`;
};

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} what was offered, and the code
 */
const answered = (result) => {
	const asserted = [[...offered], result.code];
	offered.length = 0;
	return { asserted };
};

module.exports = {
	answerAll,
	answered,
	offered
};
