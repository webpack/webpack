"use strict";

const { fixture } = require("../../../helpers/fixture");
const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const uncovered = fixture(
	"css",
	"css-syntax-minify-vendor-prefixes-selectors-keeps-a-prefixed-list-no-rule-covers"
);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media screen{${BIG}${uncovered}}`;

module.exports = { source };
