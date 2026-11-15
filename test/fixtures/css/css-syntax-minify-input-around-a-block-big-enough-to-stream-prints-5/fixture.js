"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{@media print{@scope (.x){A{border-radius:1px;BORDER-RAD;iu(s:1px}}${BIG}}}`;

module.exports = { source };
