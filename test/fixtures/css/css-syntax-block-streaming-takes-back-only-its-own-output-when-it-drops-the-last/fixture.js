"use strict";

const { repeat } = require("../_shared/record");

const mid = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.root{lead:1;${mid}dup:2;dup:2;}`;

module.exports = { source };
