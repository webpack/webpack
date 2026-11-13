"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@layer a{.b{top:0}}@layer a{.a{top:0}${filler}}`;

module.exports = { source };
