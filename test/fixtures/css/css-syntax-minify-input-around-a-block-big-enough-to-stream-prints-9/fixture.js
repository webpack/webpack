"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media print{a{color:light-dark(color(display-p3 1 0 0),blue)}${BIG}}`;

module.exports = { source };
