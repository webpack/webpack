"use strict";

const { repeat } = require("../_shared/record");

const one = repeat(10200, (i) => `.f${i}{top:${i + 1}px}`);
const two = repeat(10200, (i) => `.g${i}{left:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@layer u{@layer a{}@layer a{${one}}@layer a{${two}}}`;

module.exports = { source };
