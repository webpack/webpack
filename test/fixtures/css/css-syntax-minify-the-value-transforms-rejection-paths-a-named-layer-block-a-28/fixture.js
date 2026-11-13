"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);
const block = "{color:red;outline:1px solid blue}";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.p{${filler}a:hover${block}q:2;b:hover${block}}`;

module.exports = { source };
