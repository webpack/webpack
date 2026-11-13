"use strict";

const { repeat } = require("../_shared/record");

const depth = 70;
const open = repeat(depth, (i) => `@media m${i}{`);
/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const close = repeat(depth, () => "}");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `${open}${BIG}${close}`;

module.exports = { source };
