"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{.p{@-webkit-keyframes k{}}${BIG}b,;a,b{c:1}b,;b{c:1}}`;

module.exports = { source };
