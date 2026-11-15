"use strict";

/**
 * @param {number} from the first index
 * @param {number} to the index past the last
 * @returns {string} an element with two attributes for each index
 */
const pairs = (from, to) => {
	let out = "";
	for (let i = from; i < to; i++) out += `<a b="${i}" c="${i}x"/>`;
	return out;
};

/**
 * @returns {string} 3000 elements of two attributes each, a few past the first capacity
 */
const source = () => `<r>${pairs(0, 3000)}</r>`;

module.exports = { source };
