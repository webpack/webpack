"use strict";

// One selector written again and again, each rule joined onto the block the
// ones before it made.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => repeat(16000, (i) => `.a{--p${i}:1}`);

module.exports = { source };
