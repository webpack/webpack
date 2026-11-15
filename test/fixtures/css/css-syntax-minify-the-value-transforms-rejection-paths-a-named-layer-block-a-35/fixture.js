"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(10200, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@layer u{@layer a{}@layer a{${filler}}}`;

module.exports = { source };
