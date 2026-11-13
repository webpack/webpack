"use strict";

const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const streamed = `@layer a{${BIG}x:i;}`;

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `${streamed}@layer a{.q{top:0}}.w{color:red}`;

module.exports = { source };
