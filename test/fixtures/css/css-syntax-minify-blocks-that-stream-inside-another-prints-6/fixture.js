"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.p{${BIG}::-moz-placeholder{x:1}::-moz-selection{y:1}::placeholder{x:1}}`;

module.exports = { source };
