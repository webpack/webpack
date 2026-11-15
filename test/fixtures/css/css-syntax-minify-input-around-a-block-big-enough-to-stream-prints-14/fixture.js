"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{a{b:c}op:auto;left:auto}op:auto;right:0;bottom:0;left:auto}op:auto;left:auto}op:auto;right:0;bottom:0;left:auto}a{b(:1}a{b:c}${BIG}a{color:light-dark(color(display-p3 1 0 0),blue)}}`;

module.exports = { source };
