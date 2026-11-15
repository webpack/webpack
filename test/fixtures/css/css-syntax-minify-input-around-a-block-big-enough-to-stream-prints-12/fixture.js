"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{A{border-radius:1px;BORDER-RAD;A{-webkit-border-radius:1px;BORDER-RAD;${BIG}a{b:c}a{border-radius:1pxa{b:c}}`;

module.exports = { source };
