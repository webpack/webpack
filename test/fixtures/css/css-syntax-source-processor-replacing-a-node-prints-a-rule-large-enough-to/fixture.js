"use strict";

const { repeat } = require("../_shared/record");

const body = repeat(
	1800,
	(i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`
);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{${body}}b{color:red}`;

module.exports = { source };
