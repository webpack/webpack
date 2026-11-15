"use strict";

const { shortCode } = require("../_shared/record");

const Z = ".z{w:1}".repeat(4000);
const PIECES = { Z };

/**
 * @returns {string} a stylesheet holding a run long enough to stream
 */
const source = () => `.p{.a{x:1}.b{y:1}${Z}}`;

module.exports = { PIECES, short: shortCode(PIECES), source };
