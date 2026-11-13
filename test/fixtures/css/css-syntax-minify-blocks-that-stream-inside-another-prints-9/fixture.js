"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{@media print{${BIG}@layer x{.p{a{b:c}@layer l{}a{b:c}}}}}`;

module.exports = { source };
