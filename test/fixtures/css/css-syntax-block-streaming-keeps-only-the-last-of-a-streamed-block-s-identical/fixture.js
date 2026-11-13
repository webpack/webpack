"use strict";

const { repeat } = require("../_shared/record");

const middle = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.root{color:red;${middle}color:red;}`;

module.exports = { source };
