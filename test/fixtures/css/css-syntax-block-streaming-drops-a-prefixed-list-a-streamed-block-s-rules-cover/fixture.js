"use strict";

const { fixture } = require("../../../helpers/fixture");
const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const covered = fixture(
	"css",
	"css-syntax-minify-vendor-prefixes-selectors-drops-a-prefixed-list-the-rules"
);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media screen{${BIG}${covered}}`;

module.exports = { source };
