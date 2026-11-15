"use strict";

/**
 * What the print defers; `deferSrcdoc: false` should leave it empty.
 * @type {unknown[]}
 */
const holes = [];

/**
 * @param {string} source the body offered
 * @param {{ type: string, hostType: string, as?: string }} info what it is
 * @returns {string | undefined} a paragraph for the srcdoc document, declined otherwise
 */
const answerHtml = (source, info) =>
	info.type === "html" ? "<p>answered</p>" : undefined;

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} what was deferred, and the code
 */
const collected = (result) => {
	const asserted = [[...holes], result.code];
	holes.length = 0;
	return { asserted };
};

module.exports = {
	answerHtml,
	collected,
	holes
};
