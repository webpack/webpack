"use strict";

/**
 * @param {{ value: string }} comment a comment
 * @returns {boolean} whether it says `one`
 */
const one = (comment) => comment.value.includes("one");

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the code and the comments taken out
 */
const taken = (result) => ({
	asserted: [{ code: result.code, extractedComments: result.extractedComments }]
});

module.exports = {
	one,
	taken
};
