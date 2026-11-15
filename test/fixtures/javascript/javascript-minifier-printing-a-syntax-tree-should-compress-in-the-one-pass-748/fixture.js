"use strict";

/**
 * @returns {string} a function reading the source of, and converting to a string, a regexp of 32768 groups: one past what V8 compiles
 */
const source = () => {
	const groups = "()".repeat(32768);
	return `function f(){return/${groups}/.source+/${groups}/}`;
};

module.exports = { source };
