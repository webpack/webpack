"use strict";

const { fixture } = require("../../../helpers/fixture");
const { repeat } = require("../_shared/record");

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
const BIG = repeat(1800, rule);
const lists = `${fixture(
	"css",
	"css-syntax-minify-vendor-prefixes-selectors-keeps-a-prefixed-list-no-rule-covers-2"
)}.c::-moz-placeholder,.d::-moz-placeholder{opacity:0}.a::placeholder{color:red}.b::placeholder{color:#00f}.c::placeholder{color:#0f0}.d::placeholder{color:#ff0}`;

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media screen{${BIG}${lists}}`;

module.exports = { source };
