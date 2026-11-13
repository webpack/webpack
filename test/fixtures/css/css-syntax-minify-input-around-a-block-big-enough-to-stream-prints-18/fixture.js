"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{a{b:c}a{b:c};a,b{c:1};b,b{c:1}a{b(:1}a{b:c}a{b:c}${BIG}a{top:calc(1px + 1%);right:anchor(top);bottom:calc(1px + 1%);left:anchor(top)}}`;

module.exports = { source };
