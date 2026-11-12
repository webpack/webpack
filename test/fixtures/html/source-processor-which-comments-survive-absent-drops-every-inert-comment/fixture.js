"use strict";

/**
 * @param {string} comment a comment's text
 * @returns {boolean} whether it names a license
 */
const license = (comment) => comment.includes("@license");

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the code
 */
const printed = (result) => ({ asserted: [result.code] });

module.exports = {
	license,
	printed
};
