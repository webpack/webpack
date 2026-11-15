"use strict";

const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const value = "rgb(255,0,0)0.50px";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@function --f(){${BIG}result:${value}}`;

module.exports = { source };
