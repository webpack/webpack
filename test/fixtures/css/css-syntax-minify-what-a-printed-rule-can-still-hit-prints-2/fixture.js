"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.p{${BIG}@layer x{{}}x{}@layer x{d{e:f}}}`;

module.exports = { source };
