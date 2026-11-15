"use strict";

const { fixture } = require("../../../helpers/fixture");
const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1488, rule);
const uncovered = fixture(
	"css",
	"css-syntax-minify-vendor-prefixes-selectors-keeps-a-prefixed-list-no-rule-covers"
);

/**
 * @returns {string} the stylesheet the test reads: 1488 rules are the fewest
 * whose nodes pass `_STREAM_MIN_NODES`, so the block streams
 */
const source = () => `@media screen{${BIG}${uncovered}}`;

module.exports = { source };
