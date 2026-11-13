"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media print{.p{a{b:c}@scope (.x){ {\ny/**/;\n}}a{b:c}${BIG}}}`;

module.exports = { source };
