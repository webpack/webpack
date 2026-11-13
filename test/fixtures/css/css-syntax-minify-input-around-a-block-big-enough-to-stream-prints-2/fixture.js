"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{@media print{@LAYER X{A{COLOR:C\\OLOR-MIX(IN SRGB,#123,RED)}}${BIG}a{b:c;b\\:c}}}`;

module.exports = { source };
