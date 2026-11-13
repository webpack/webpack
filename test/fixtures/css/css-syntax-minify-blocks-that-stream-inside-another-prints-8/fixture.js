"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@supports (a:b){B,;A,B{C:}B,;B{C:1}B,;A,B{C:}B,;B{C:1}${BIG}}`;

module.exports = { source };
