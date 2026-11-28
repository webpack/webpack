"use strict";

// One selector written again and again with another between each, so each is
// read against every earlier one.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => repeat(20000, (i) => `.a{--p${i}:1}.b${i}{top:0}`);

module.exports = { source };
