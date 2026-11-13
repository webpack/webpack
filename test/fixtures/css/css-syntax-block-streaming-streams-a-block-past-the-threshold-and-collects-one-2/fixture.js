"use strict";

const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media screen{${BIG}}`;

module.exports = { source };
