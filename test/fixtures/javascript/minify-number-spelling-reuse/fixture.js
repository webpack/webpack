"use strict";

/**
 * @param {number} count how many distinct numeric literals to print
 * @returns {string} a program retaining every literal
 */
module.exports.distinct = (count) => {
	/** @type {number[]} */
	const values = [];
	for (let i = 0; i < count; i++) values.push(10001 + i);
	return `console.log([${values.join(",")}]);`;
};

/**
 * @returns {string} repeated literals with decimal, hexadecimal and exponent spellings
 */
module.exports.source = () =>
	"console.log([1001,1000000,255000,0.00000123,1.25e20,-1001,-0," +
	"1001,1000000,255000,0.00000123,1.25e20,-1001,-0]," +
	"{1000000:1000000});";
