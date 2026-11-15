"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(3400, (i) => `.f${i}{top:${i + 1}px}`);
const block = "{color:red;outline:1px solid blue}";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media all{${filler}a:hover${block}b:hover${block}}`;

module.exports = { source };
