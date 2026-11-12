"use strict";

const { repeat, shortCode } = require("../_shared/record");

const EMPTY = repeat(6000, (i) => `.e${i}{}`);
const PIECES = { EMPTY };

/**
 * @returns {string} a stylesheet holding a run long enough to stream
 */
const source = () => `@media a{${EMPTY}.keep{color:red}}`;

module.exports = { PIECES, short: shortCode(PIECES), source };
