"use strict";

const { repeat } = require("../_shared/record");

const nested = repeat(3000, (i) => `& .x${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.from{${nested}}`;

module.exports = { source };
