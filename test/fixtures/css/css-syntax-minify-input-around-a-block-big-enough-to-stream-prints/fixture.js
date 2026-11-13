"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@supports (a:b){.p{@media print{display:-webkit-flex;display:flex}}${BIG}}`;

module.exports = { source };
