"use strict";

/**
 * @returns {undefined} no answer
 */
const noAnswer = () => undefined;

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the code
 */
const printed = (result) => ({ asserted: [result.code] });

module.exports = {
	noAnswer,
	printed
};
