"use strict";

const { repeat } = require("../_shared/record");

// One longhand walked back past more names than the memo holds.
const names = repeat(33000, (i) => `x${i}:1;`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{margin:0;${names}margin-top:1px}`;

module.exports = { source };
