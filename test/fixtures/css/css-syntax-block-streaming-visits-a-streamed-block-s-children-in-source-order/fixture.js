"use strict";

const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media screen{${repeat(1800, (i) => `p${i}:v${i};${rule(i)}`)}}`;

module.exports = { source };
