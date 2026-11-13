"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(4000, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media all{.a{top:0}${filler}.a{top:0}}`;

module.exports = { source };
