"use strict";

/**
 * How often the renderer was asked for CSS.
 * @type {{ calls: number }}
 */
const count = { calls: 0 };

/**
 * @param {string} source the body offered
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} each CSS body as a custom property naming the call
 */
const numberCalls = (source, info) =>
	info.type === "css" ? `--call:${++count.calls}` : source;

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} how often it was called, and the code
 */
const callsMade = (result) => {
	const asserted = [count.calls, result.code];
	count.calls = 0;
	return { asserted };
};

module.exports = {
	callsMade,
	count,
	numberCalls
};
