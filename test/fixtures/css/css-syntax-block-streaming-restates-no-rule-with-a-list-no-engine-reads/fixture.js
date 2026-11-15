"use strict";

const { repeat, shortCode } = require("../_shared/record");

const FILLER = repeat(6000, (i) => `.f${i}{margin:0}`);
const NAMES = Array.from({ length: 6000 }, (_, i) => `.f${i}`).sort();
const PIECES = { FILLER: `${NAMES.join(",")}{margin:0}` };

/**
 * @returns {string} a streamed layer block ending on a list an unknown pseudo-class drops whole, before a gathered `.a` saying the same block
 */
const source = () =>
	`@layer x{${FILLER}.a,:unknown{color:red}}@layer x{.a{color:red}}`;

module.exports = { PIECES, short: shortCode(PIECES), source };
