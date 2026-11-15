"use strict";

const { repeat, shortCode } = require("../_shared/record");

const FILLER = repeat(6000, (i) => `.f${i}{margin:0}`);
const NAMES = Array.from({ length: 6000 }, (_, i) => `.f${i}`).sort();
const PIECES = { FILLER: `${NAMES.join(",")}{margin:0}` };

/**
 * @returns {string} streamed `@media` blocks, which the rule before each must not take a later `.b` across
 */
const source = () =>
	`@layer x{${FILLER}.c{color:red}@media all{${FILLER}.b{color:blue}}}` +
	"@layer x{.b{color:red}}" +
	`@layer y{.c{color:red}@media all{${PIECES.FILLER}.b{color:blue}}.b{color:red}}` +
	`@layer z{${FILLER}.d{color:red}.c{color:red}@media all{${FILLER}.b{color:blue}}.b{color:red}}`;

module.exports = { PIECES, short: shortCode(PIECES), source };
